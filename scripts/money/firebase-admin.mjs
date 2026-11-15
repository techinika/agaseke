import admin from "firebase-admin";

function fail(message) {
  console.error(`ledger migration: ${message}`);
  process.exit(1);
}

export function getFirestore() {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || (emulatorHost ? "demo-agaseke" : undefined);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    fail("set FIREBASE_PROJECT_ID or FIRESTORE_EMULATOR_HOST");
  }

  if (emulatorHost) {
    admin.initializeApp({ projectId });
    return admin.firestore();
  }

  if (!clientEmail || !privateKey) {
    fail(
      "set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or set FIRESTORE_EMULATOR_HOST",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    projectId,
  });
  return admin.firestore();
}
