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
  | "likes_milestone"
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
    likes_milestone: "sparkles",
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
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export function subscribeToNotifications(
  userId: string,
  onData: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) return () => {};
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
  if (!db) return;
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!db) return;
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
  if (!db) return () => {};
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

function createdAtMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

export function subscribeToBroadcastNotices(
  userId: string,
  onData: (notices: Array<Record<string, unknown>>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map(
          (d): Record<string, unknown> => ({
            id: d.id,
            ...(d.data() as Record<string, unknown>),
          }),
        )
        .filter((item) => item.type === "broadcast_received")
        .sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt))
        .slice(0, 100);
      onData(items);
    },
    (error) => onError?.(error),
  );
}
