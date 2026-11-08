/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time migration: move supporters-only media into the private bucket and
 * store object keys instead of public URLs.
 *
 * Dry run: node scripts/migrate-private-media.js
 * Apply:   node scripts/migrate-private-media.js --apply
 *
 * Two phases per post:
 *   1. POST the object keys to the upload worker's /migrate-private endpoint,
 *      which copies them from the public bucket into the private bucket.
 *   2. Rewrite creatorContent so contentUrl/coverUrl/mediaUrls hold those keys.
 *
 * Requires:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   UPLOAD_WORKER_URL        e.g. https://upload.api.agaseke.me
 *   UPLOAD_MIGRATION_TOKEN   matches the worker's MIGRATION_TOKEN secret
 *   ASSETS_BASE_URL          e.g. https://assets.agaseke.me
 *
 * Nothing is deleted from the public bucket. Once the documents are rewritten
 * and verified, remove the copied objects manually.
 */

const admin = require("firebase-admin");

const apply = process.argv.includes("--apply");
const deleteSource = process.argv.includes("--delete-source");
const BATCH_SIZE = 100;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const workerUrl = (process.env.UPLOAD_WORKER_URL || "").replace(/\/$/, "");
const migrationToken = process.env.UPLOAD_MIGRATION_TOKEN;
const assetsBaseUrl = (process.env.ASSETS_BASE_URL || "https://assets.agaseke.me").replace(
  /\/$/,
  "",
);

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY env vars",
  );
  process.exit(1);
}

if (!workerUrl || !migrationToken) {
  console.error("Missing UPLOAD_WORKER_URL or UPLOAD_MIGRATION_TOKEN env vars");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

function parseAssetValue(value) {
  if (typeof value !== "string" || !value) return { key: null, external: null };
  if (value.startsWith(`${assetsBaseUrl}/`)) {
    const raw = value.slice(assetsBaseUrl.length + 1).split("?")[0];
    try {
      return { key: decodeURIComponent(raw), external: null };
    } catch {
      return { key: raw, external: null };
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    return { key: null, external: value };
  }
  // Already a bare key (no scheme), nothing to do.
  return { key: null, external: null };
}

function toKey(value) {
  return parseAssetValue(value).key;
}

function collectAssets(data) {
  const keys = new Set();
  const external = new Set();
  const fields = ["contentUrl", "coverUrl", "thumbnailUrl", "mediaUrls"];
  for (const field of fields) {
    const values = Array.isArray(data[field]) ? data[field] : [data[field]];
    for (const value of values) {
      const parsed = parseAssetValue(value);
      if (parsed.key) keys.add(parsed.key);
      if (parsed.external) external.add(parsed.external);
    }
  }
  return { keys: [...keys], external: [...external] };
}

function replaceValue(value, map) {
  if (typeof value === "string") return map.get(toKey(value)) || value;
  if (Array.isArray(value)) return value.map((entry) => replaceValue(entry, map));
  return value;
}

async function copyObjects(keys) {
  const res = await fetch(`${workerUrl}/migrate-private`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-migrate-token": migrationToken,
    },
    body: JSON.stringify({ keys, deleteSource }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker copy failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function main() {
  console.log(apply ? "Applying private media migration..." : "Dry run - no changes will be written.");

  const snap = await db.collection("creatorContent").where("isPrivate", "==", true).get();
  console.log(`Found ${snap.size} private post(s)`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const { keys, external } = collectAssets(data);

    if (external.length > 0) {
      console.warn(
        `  ${doc.id}: ${external.length} media URL(s) are not under ${assetsBaseUrl} and were left unchanged: ${external.join(", ")}`,
      );
    }

    if (keys.length === 0) {
      skipped++;
      continue;
    }

    try {
      if (apply) {
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const result = await copyObjects(keys.slice(i, i + BATCH_SIZE));
          const bad = (result.results || []).filter(
            (entry) => entry.status !== "copied" && entry.status !== "missing",
          );
          if (bad.length) throw new Error(`copy failed for ${bad.map((b) => b.key).join(", ")}`);
          const missing = (result.results || []).filter((entry) => entry.status === "missing");
          if (missing.length) {
            console.warn(`  ${doc.id}: ${missing.length} object(s) missing from the public bucket`);
          }
        }

        const map = new Map(keys.map((key) => [`${assetsBaseUrl}/${key}`, key]));
        const update = {};
        for (const field of ["contentUrl", "coverUrl", "thumbnailUrl", "mediaUrls"]) {
          if (data[field] !== undefined) update[field] = replaceValue(data[field], map);
        }
        await doc.ref.update(update);
      } else {
        console.log(`  ${doc.id}: ${keys.length} object(s) -> ${keys.join(", ")}`);
      }

      migrated++;
    } catch (error) {
      failed++;
      console.error(`failed ${doc.id}:`, error.message);
    }
  }

  console.log(
    `Done. ${apply ? "Migrated" : "Would migrate"} ${migrated}, skipped ${skipped} without media, failed ${failed}.`,
  );

  if (apply && migrated > 0) {
    console.log(
      "Verify the posts load with a supporter session, then delete the source objects from the public bucket.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
