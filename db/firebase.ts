import {
  initializeApp,
  getApp,
  getApps,
  type FirebaseApp,
} from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

/**
 * True when every public Firebase key is present. When false the app can still
 * render (marketing pages, /dev/components, tests) but auth/database calls are
 * unavailable. Production builds always set these values.
 */
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export let app: FirebaseApp | null = null;
export let auth: Auth = null as unknown as Auth;
export let db: Firestore = null as unknown as Firestore;
export let storage: FirebaseStorage = null as unknown as FirebaseStorage;

export const googleProvider = new GoogleAuthProvider();

if (firebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    if (
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    ) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        ),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (error) {
    app = null;
    auth = null as unknown as Auth;
    db = null as unknown as Firestore;
    storage = null as unknown as FirebaseStorage;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[firebase] client disabled:", error);
    }
  }
}
