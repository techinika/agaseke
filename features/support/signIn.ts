import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/db/firebase";

export type SignInOutcome = "signed-in" | "redirecting" | "cancelled";

const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

async function ensureSupporterProfile(
  user: User,
  referralCreator?: string | null,
): Promise<void> {
  if (!db) return;

  const ref = doc(db, "profiles", user.uid);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) return;

    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      type: "supporter",
      onboarded: false,
      totalSupport: 0,
      isAdmin: false,
      phoneNumber: "",
      referralCreator: referralCreator ?? null,
      totalSupportedCreators: 0,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } catch {
    // A missing profile must not block a payment the worker can still take.
  }
}

/**
 * Sign in without leaving the support flow when possible. If the in-app
 * browser blocks the popup we fall back to a full-page redirect; the caller
 * keeps the draft in sessionStorage so the sheet can resume on return.
 */
export async function signInSupporter(
  referralCreator?: string | null,
): Promise<SignInOutcome> {
  if (!auth) throw new Error("Sign-in is not available right now.");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureSupporterProfile(result.user, referralCreator);
    return "signed-in";
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";

    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return "cancelled";
    }

    if (POPUP_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider);
      return "redirecting";
    }

    throw error instanceof Error ? error : new Error("Sign-in failed. Please try again.");
  }
}

/** Resolve a redirect-based sign-in when the creator page reloads. */
export async function completeSupporterRedirect(): Promise<boolean> {
  if (!auth) return false;
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return false;
    await ensureSupporterProfile(result.user);
    return true;
  } catch {
    return false;
  }
}
