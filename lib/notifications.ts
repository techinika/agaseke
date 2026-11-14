export type NotificationType =
  | "support_received"
  | "new_sale"
  | "new_order"
  | "verification_approved"
  | "verification_rejected"
  | "new_message"
  | "new_content"
  | "new_product"
  | "new_gathering"
  | "new_giveaway"
  | "booking_request"
  | "booking_accepted"
  | "booking_declined"
  | "booking_paid"
  | "payout_processed"
  | "broadcast_received"
  | "new_user"
  | "new_creator"
  | "new_transaction"
  | "withdrawal"
  | "new_like"
  | "new_comment"
  | "booking_reminder";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: unknown;
  metadata?: Record<string, unknown>;
  link?: string;
  imageUrl?: string;
  actorName?: string;
  actorId?: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  link?: string;
  imageUrl?: string;
  actorName?: string;
  actorId?: string;
}

export function getNotificationIconKey(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    support_received: "heart",
    new_sale: "shoppingBag",
    new_order: "package",
    verification_approved: "checkCircle",
    verification_rejected: "xCircle",
    new_message: "messageSquare",
    new_content: "fileText",
    new_product: "store",
    new_gathering: "calendar",
    new_giveaway: "gift",
    booking_request: "calendarClock",
    booking_accepted: "checkCircle",
    booking_declined: "xCircle",
    booking_paid: "creditCard",
    payout_processed: "wallet",
    broadcast_received: "megaphone",
    new_user: "userPlus",
    new_creator: "userCheck",
    new_transaction: "creditCard",
    withdrawal: "wallet",
    new_like: "heart",
    new_comment: "messageSquare",
    booking_reminder: "calendarClock",
  };
  return iconMap[type] || "bell";
}

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export function subscribeToNotifications(
  userId: string,
  onData: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as Notification[];
      onData(notifs);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const unreadDocs = snapshot.docs.filter((d) => !d.data().read);
  if (unreadDocs.length === 0) return;
  const batch = writeBatch(db);
  unreadDocs.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

export function subscribeToUnreadNotificationCount(
  userId: string,
  onCount: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      onCount(snapshot.docs.filter((d) => !d.data().read).length);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function subscribeToBroadcastNotices(
  userId: string,
  onData: (notices: Array<Record<string, unknown>>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("type", "==", "broadcast_received"),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
      );
    },
    (error) => onError?.(error),
  );
}
