import { adminDb, admin } from "@/db/firebaseAdmin";

export type LogLevel = "info" | "success" | "warning" | "error";
export type LogCategory =
  | "auth"
  | "payment"
  | "payout"
  | "support"
  | "store"
  | "giveaway"
  | "messaging"
  | "verification"
  | "admin"
  | "system"
  | "general";

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  creatorId?: string;
  creatorHandle?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function logActivity(data: LogEntry): Promise<string | null> {
  try {
    const logRef = await adminDb.collection("activityLogs").add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return logRef.id;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}

export function logInfo(
  category: LogCategory,
  message: string,
  data?: Partial<LogEntry>,
) {
  return logActivity({ level: "info", category, message, ...data });
}

export function logSuccess(
  category: LogCategory,
  message: string,
  data?: Partial<LogEntry>,
) {
  return logActivity({ level: "success", category, message, ...data });
}

export function logWarning(
  category: LogCategory,
  message: string,
  data?: Partial<LogEntry>,
) {
  return logActivity({ level: "warning", category, message, ...data });
}

export function logError(
  category: LogCategory,
  message: string,
  data?: Partial<LogEntry>,
) {
  return logActivity({ level: "error", category, message, ...data });
}
