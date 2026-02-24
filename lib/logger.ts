import { db } from "@/db/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";

interface LogEntry {
  action: string; // e.g., "USER_SIGNUP", "PAYMENT_WEBHOOK", "FETCH_PROFILE"
  category: "AUTH" | "PAYMENT" | "CONTENT" | "SYSTEM";
  status: LogLevel;
  message: string;
  userId?: string | null;
  metadata?: Record<string, any>; 
}

export const logActivity = async (entry: LogEntry) => {
  try {
    // Only log in production to save Firestore writes during local dev (optional)
    if (process.env.NODE_ENV === "development") return;

    await addDoc(collection(db, "activityLogs"), {
      ...entry,
      timestamp: serverTimestamp(),
      platform: "web",
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "server",
    });
  } catch (e) {
    console.error("CRITICAL: Logger failed:", e);
  }
};
