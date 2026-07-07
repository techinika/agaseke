import type { Env } from "./types";
import { firestorePost } from "./firestore";

export async function logActivity(
  env: Env,
  level: string,
  category: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      level: { stringValue: level },
      category: { stringValue: category },
      message: { stringValue: message.slice(0, 2000) },
      createdAt: { timestampValue: now },
    };

    if (metadata) {
      fields.metadata = { stringValue: JSON.stringify(metadata).slice(0, 5000) };
    }

    await firestorePost(env, "activityLogs", { fields });
  } catch (err) {
    console.error("Activity log error:", err);
  }
}
