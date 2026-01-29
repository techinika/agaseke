/* eslint-disable @typescript-eslint/no-explicit-any */
import { signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { toast } from "sonner";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export const handleGoogleLogin = async (reservedUsername: string | null) => {
  toast.info("Connecting to Google...");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, "profiles", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      toast.success("Welcome to Agaseke!");

      const initialProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        type: "supporter",
        onboarded: false,
        totalSupport: 0,
        totalSupportedCreators: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      await setDoc(userRef, initialProfile);

      if (reservedUsername) {
        window.location.href = `/onboarding?username=${encodeURIComponent(reservedUsername)}`;
      } else {
        window.location.href = "/supporter";
      }
    } else {
      const userData = userSnap.data();

      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });

      toast.success(
        `Welcome back, ${user?.displayName ? user?.displayName.split(" ")[0] : "User"}!`,
      );

      if (userData?.type === "creator") {
        window.location.href = "/creator";
      } else {
        window.location.href = "/supporter";
      }
    }
  } catch (error: any) {
    if (error.code === "auth/popup-closed-by-user") {
      toast.dismiss();
      return;
    }

    console.error("Login failed:", error);
    toast.error("Authentication failed. Please try again.");
  }
};
