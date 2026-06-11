/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time migration: backfill creator.supporterUids map from existing supportedCreators records.
 *
 * Run: node scripts/backfillSupporterUids.js
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars
 * (same as the Next.js app uses at runtime).
 */

const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY env vars");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

async function main() {
  console.log("Fetching all supportedCreators docs...");
  const snap = await db.collection("supportedCreators").get();

  const byCreator = new Map(); // creatorHandle -> Set of supporterUids
  snap.docs.forEach((d) => {
    const data = d.data();
    const creatorId = data.creatorId;
    const supporterId = data.supporterId;
    if (!creatorId) return;
    if (!supporterId || supporterId === "anonymous" || supporterId === "null") return;
    if (!byCreator.has(creatorId)) byCreator.set(creatorId, new Set());
    byCreator.get(creatorId).add(supporterId);
  });

  console.log(`Found ${byCreator.size} creators with supporter records`);

  let updated = 0;
  const batchSize = 500;

  for (const [handle, uidSet] of byCreator) {
    const supporterUids = {};
    for (const uid of uidSet) {
      supporterUids[uid] = true;
    }

    try {
      await db.collection("creators").doc(handle).update({ supporterUids });
      updated++;
      if (updated % 50 === 0) console.log(`Updated ${updated}/${byCreator.size} creators`);
    } catch (e) {
      console.error(`Failed to update creator ${handle}:`, e.message);
    }
  }

  console.log(`Done. Updated ${updated} creator docs with supporterUids.`);
}

main().catch(console.error);
