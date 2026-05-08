import admin from "firebase-admin";

function initializeAdmin() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials not fully configured");
    return admin.firestore();
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }

  return admin.firestore();
}

export const adminDb = initializeAdmin();