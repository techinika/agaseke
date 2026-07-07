import type { Env } from "./types";
import { firestorePost } from "./firestore";

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  link?: string;
  imageUrl?: string;
  actorName?: string;
  actorId?: string;
}

export async function createNotification(
  env: Env,
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const { userId, type, title, message, metadata, link, imageUrl, actorName, actorId } = params;

    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      userId: { stringValue: userId },
      type: { stringValue: type },
      title: { stringValue: title },
      message: { stringValue: message },
      read: { booleanValue: false },
      createdAt: { timestampValue: now },
    };

    if (metadata) fields.metadata = { stringValue: JSON.stringify(metadata) };
    if (link) fields.link = { stringValue: link };
    if (imageUrl) fields.imageUrl = { stringValue: imageUrl };
    if (actorName) fields.actorName = { stringValue: actorName };
    if (actorId) fields.actorId = { stringValue: actorId };

    const result = await firestorePost(env, "notifications", { fields });
    if (!result) return null;

    const docResult = result as { name?: string };
    if (docResult.name) {
      const parts = docResult.name.split("/");
      return parts[parts.length - 1];
    }
    return null;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
