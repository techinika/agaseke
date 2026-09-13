/* One-off migration: stamp publishedAt on pre-existing, non-draft
 * creatorContent docs so reader feeds can order by publishedAt without
 * dropping legacy content (Firestore orderBy excludes docs missing the field).
 *
 * Run:  node scripts/backfill-publishedAt.cjs
 * Requires FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * in .env.local. Drafts are skipped — they will get a real publishedAt the
 * first time they're published via the editor.
 */

const { readFileSync } = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const env = {};
  try {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#\s]*)"?\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch (err) {
    console.error("Could not read .env.local:", err.message);
    process.exit(1);
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  const db = admin.firestore();

  const snap = await db.collection("creatorContent").get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.publishedAt) {
      skipped++;
      continue;
    }
    if (data.status === "draft") {
      skipped++;
      continue;
    }
    const publishedAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
    await doc.ref.update({ publishedAt });
    updated++;
    console.log(`  stamped ${doc.id} (createdAt=${data.createdAt ? "yes" : "no"})`);
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} (skipped = already has publishedAt, or is a draft)`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});