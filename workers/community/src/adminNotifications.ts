import type { Env } from "./types";
import { firestorePost, convertToFields, firestoreQuery, convertFromFields } from "./firestore";

export async function createNotification(
  env: Env,
  data: {
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
): Promise<string | null> {
  const doc = await firestorePost(env, "notifications", {
    fields: convertToFields({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {},
      link: data.link || "",
      imageUrl: data.imageUrl || "",
      actorName: data.actorName || "",
      actorId: data.actorId || "",
    }),
  });
  if (!doc) return null;
  const parts = (doc.name as string).split("/");
  return parts[parts.length - 1];
}

export async function notifyAdmins(
  env: Env,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    const adminDocs = await firestoreQuery(env, "profiles", "isAdmin", { booleanValue: true }, 20);
    for (const doc of adminDocs) {
      const profile = convertFromFields(doc.fields);
      const uid = profile.uid as string;
      if (uid) {
        await createNotification(env, {
          userId: uid,
          type: "new_community_subscription",
          title,
          message,
          link: link || "/admin",
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}
