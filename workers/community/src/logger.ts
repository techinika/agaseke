import type { Env } from "./types";
import { firestorePost, convertToFields } from "./firestore";

export async function logActivity(
  env: Env,
  level: string,
  category: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await firestorePost(env, "activityLogs", {
      fields: convertToFields({
        level,
        category,
        message: message.slice(0, 2000),
        createdAt: new Date().toISOString(),
        metadata: metadata || {},
      }),
    });
  } catch (err) {
    console.error("Log write failed:", err);
  }
}
