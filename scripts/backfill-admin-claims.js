/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time migration: copy profiles.isAdmin=true to Firebase custom claims.
 *
 * Run dry-run: node scripts/backfill-admin-claims.js
 * Apply:       node scripts/backfill-admin-claims.js --apply
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 */

const admin = require("firebase-admin");

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY env vars",
  );
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  console.log(apply ? "Applying admin claims..." : "Dry run - no changes will be written.");
  console.log("Fetching profiles with isAdmin=true...");

  const snap = await db.collection("profiles").where("isAdmin", "==", true).get();
  console.log(`Found ${snap.size} admin profile(s)`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of snap.docs) {
    const uid = profile.id;

    try {
      const user = await auth.getUser(uid);
      const existingClaims = user.customClaims || {};

      if (existingClaims.admin === true) {
        skipped++;
        console.log(`skip ${uid}: admin claim already set`);
        continue;
      }

      console.log(`${apply ? "set" : "would set"} admin claim for ${uid} (${user.email || "no email"})`);

      if (apply) {
        await auth.setCustomUserClaims(uid, { ...existingClaims, admin: true });
      }

      updated++;
    } catch (error) {
      failed++;
      console.error(`failed ${uid}:`, error.message);
    }
  }

  console.log(
    `Done. ${apply ? "Updated" : "Would update"} ${updated}, skipped ${skipped}, failed ${failed}.`,
  );

  if (apply && updated > 0) {
    console.log("Admins must refresh their ID token or sign in again for claims to apply.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
