import type { Env } from "./types";
import { firestorePost, convertToFields } from "./firestore";

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

    const fields = convertToFields({
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: now,
    });

    if (metadata) {
      fields.metadata = { mapValue: { fields: convertToFields(metadata) } };
    }
    if (link) fields.link = { stringValue: link };
    if (imageUrl) fields.imageUrl = { stringValue: imageUrl };
    if (actorName) fields.actorName = { stringValue: actorName };
    if (actorId) fields.actorId = { stringValue: actorId };

    const doc = await firestorePost(env, "notifications", { fields });
    if (!doc) return null;

    const name = doc.name as string;
    const parts = name.split("/");
    return parts[parts.length - 1];
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function createNotificationsForMultipleUsers(
  env: Env,
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
): Promise<string[]> {
  const createdIds: string[] = [];
  for (const userId of userIds) {
    const id = await createNotification(env, { ...params, userId });
    if (id) createdIds.push(id);
  }
  return createdIds;
}

export async function notifyAdmins(
  env: Env,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    const results = await firestoreQueryAdmins(env);
    for (const adminDoc of results) {
      const adminId = extractDocId(adminDoc.name);
      if (adminId) {
        await createNotification(env, {
          userId: adminId,
          type: "new_transaction",
          title,
          message,
          link: link || "/admin/transactions",
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}

async function firestoreQueryAdmins(
  env: Env
): Promise<Array<{ name: string; fields: Record<string, unknown> }>> {
  const token = await getFirestoreTokenRef(env);
  if (!token) return [];

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/profiles:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "profiles" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "isAdmin" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
      },
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .filter((d): d is { document: { name: string; fields: Record<string, unknown> } } =>
      d !== null && typeof d === "object" && "document" in d
    )
    .map((d) => d.document);
}

function extractDocId(name: string): string | null {
  const parts = name.split("/");
  return parts[parts.length - 1] || null;
}

async function getFirestoreTokenRef(env: Env): Promise<string | null> {
  const { getFirestoreToken } = await import("./firestore");
  return getFirestoreToken(env);
}
