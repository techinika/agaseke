import admin from "firebase-admin";

let initialized = false;

function ensureInitialized() {
  if (initialized || admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  initialized = true;
}

function getFirestore() {
  ensureInitialized();
  return admin.firestore();
}

function getAuth() {
  ensureInitialized();
  return admin.auth();
}

const db = new Proxy({} as admin.firestore.Firestore, {
  get: (_target, prop) => {
    const firestore = getFirestore();
    const value = (firestore as any)[prop];
    return typeof value === "function" ? value.bind(firestore) : value;
  },
});

const auth = new Proxy({} as admin.auth.Auth, {
  get: (_target, prop) => {
    const a = getAuth();
    const value = (a as any)[prop];
    return typeof value === "function" ? value.bind(a) : value;
  },
});

export const adminDb = db;
export const adminAuth = auth;
export { admin };
