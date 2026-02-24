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

export const handleGoogleLogin = async (
  reservedUsername: string | null,
  referralCreator: string | null,
) => {
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
        isAdmin: false,
        phoneNumber: "",
        referralCreator: referralCreator ?? null,
        totalSupportedCreators: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      await setDoc(userRef, initialProfile);

      try {
        await fetch("/api/comms/email/welcome/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.displayName || "Supporter",
          }),
        });
      } catch (emailError) {
        console.error("Welcome email failed to send:", emailError);
      }

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
