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
  | "payout_processed"
  | "broadcast_received";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
    payout_processed: "wallet",
    broadcast_received: "megaphone",
  };
  return iconMap[type] || "bell";
}
