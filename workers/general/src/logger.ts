import { firestorePost } from "./firestore";

export async function logError(
  env: Record<string, string>,
  level: string,
  category: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      level: { stringValue: level },
      category: { stringValue: category },
      message: { stringValue: message.slice(0, 5000) },
      createdAt: { timestampValue: now },
    };

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined) {
          fields[key] = { stringValue: String(value).slice(0, 2000) };
        }
      }
    }

    await firestorePost(env as any, "activityLogs", { fields });
  } catch {
    // Silently fail - logging should never break the app
  }
}
