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
    const now = new Date().toISOString();
    const fields = convertToFields({
      level,
      category,
      message: message.slice(0, 2000),
      createdAt: now,
    });
    if (metadata) {
      fields.metadata = { mapValue: { fields: convertToFields(metadata) } };
    }
    await firestorePost(env, "activityLogs", { fields });
  } catch (err) {
    console.error("Activity log error:", err);
  }
}
