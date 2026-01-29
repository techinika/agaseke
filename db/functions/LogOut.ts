import { signOut } from "firebase/auth";
import { auth } from "@/db/firebase";
import { toast } from "sonner";

export const handleLogout = async () => {
  try {
    await signOut(auth);
    toast.success("Logged out successfully");

    window.location.href = "/";
  } catch (error) {
    console.error("Error logging out:", error);
    toast.error("Failed to log out. Please try again.");
  }
};
