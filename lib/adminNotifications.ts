import { adminDb, admin } from "@/db/firebaseAdmin";
import type { CreateNotificationParams } from "./notifications";

export async function createNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const { userId, type, title, message, metadata, link, imageUrl, actorName, actorId } = params;

    const notificationData = {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(metadata && { metadata }),
      ...(link && { link }),
      ...(imageUrl && { imageUrl }),
      ...(actorName && { actorName }),
      ...(actorId && { actorId }),
    };

    const docRef = await adminDb.collection("notifications").add(notificationData);
    return docRef.id;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function createNotificationsForMultipleUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
): Promise<string[]> {
  const createdIds: string[] = [];

  for (const userId of userIds) {
    const id = await createNotification({
      ...params,
      userId,
    });
    if (id) {
      createdIds.push(id);
    }
  }

  return createdIds;
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    await adminDb
      .collection("notifications")
      .doc(notificationId)
      .update({ read: true });
    return true;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<boolean> {
  try {
    const q = adminDb
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false);

    const snapshot = await q.get();

    if (snapshot.empty) return true;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return false;
  }
}
