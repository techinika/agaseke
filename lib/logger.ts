import { db } from "@/db/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
    const logRef = await addDoc(collection(db, "activityLogs"), {
      ...data,
      createdAt: serverTimestamp(),
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

export function getLogLevelColor(level: LogLevel): string {
  switch (level) {
    case "success":
      return "text-green-600 bg-green-50";
    case "warning":
      return "text-amber-600 bg-amber-50";
    case "error":
      return "text-red-600 bg-red-50";
    default:
      return "text-blue-600 bg-blue-50";
  }
}

export function getCategoryColor(category: LogCategory): string {
  switch (category) {
    case "auth":
      return "text-purple-600 bg-purple-50";
    case "payment":
      return "text-green-600 bg-green-50";
    case "payout":
      return "text-emerald-600 bg-emerald-50";
    case "support":
      return "text-orange-600 bg-orange-50";
    case "store":
      return "text-cyan-600 bg-cyan-50";
    case "giveaway":
      return "text-pink-600 bg-pink-50";
    case "messaging":
      return "text-orange-600 bg-orange-50";
    case "verification":
      return "text-blue-600 bg-blue-50";
    case "admin":
      return "text-slate-600 bg-slate-50";
    case "system":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-slate-600 bg-slate-50";
  }
}
