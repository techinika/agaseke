/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Heart,
  ShoppingBag,
  Package,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Store,
  Calendar,
  Gift,
  CalendarClock,
  Wallet,
  Megaphone,
  CheckCheck,
  Loader,
  ArrowRight,
  UserPlus,
  UserCheck,
  CreditCard,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notifications";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/lib/notifications";
import { useRouter } from "next/navigation";
import { t as translate } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Drawer } from "./Drawer";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const iconMap: Record<NotificationType, React.ReactNode> = {
  support_received: <Heart size={18} className="text-danger" />,
  new_sale: <ShoppingBag size={18} className="text-brand-strong" />,
  new_order: <Package size={18} className="text-info" />,
  verification_approved: <CheckCircle size={18} className="text-success" />,
  verification_rejected: <XCircle size={18} className="text-danger" />,
  new_message: <MessageSquare size={18} className="text-info" />,
  new_content: <FileText size={18} className="text-chart-5" />,
  new_product: <Store size={18} className="text-warning" />,
  new_gathering: <Calendar size={18} className="text-chart-6" />,
  new_giveaway: <Gift size={18} className="text-chart-4" />,
  booking_request: <CalendarClock size={18} className="text-chart-2" />,
  booking_accepted: <CheckCircle size={18} className="text-success" />,
  booking_declined: <XCircle size={18} className="text-danger" />,
  booking_paid: <CreditCard size={18} className="text-success" />,
  payout_processed: <Wallet size={18} className="text-success" />,
  broadcast_received: <Megaphone size={18} className="text-brand-strong" />,
  new_user: <UserPlus size={18} className="text-info" />,
  new_creator: <UserCheck size={18} className="text-success" />,
  new_transaction: <CreditCard size={18} className="text-chart-5" />,
  withdrawal: <Wallet size={18} className="text-brand-strong" />,
  new_like: <Heart size={18} className="text-danger" />,
  new_comment: <MessageSquare size={18} className="text-info" />,
  booking_reminder: <CalendarClock size={18} className="text-chart-2" />,
};

const getIcon = (type: NotificationType): React.ReactNode => {
  return iconMap[type] || <Bell size={18} className="text-muted-fg" />;
};

export default function NotificationDrawer({
  isOpen,
  onClose,
  userId,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const router = useRouter();

  const t = (v: any): number => {
    if (!v) return 0;
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v === "string" || typeof v === "number") return new Date(v).getTime();
    return 0;
  };

  /* eslint-disable react-hooks/set-state-in-effect -- realtime notifications subscription */
  useEffect(() => {
    if (!isOpen || !userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToNotifications(
      userId,
      (notifs) => {
        const sorted = [...notifs].sort((a, b) =>
          t(a.createdAt) < t(b.createdAt) ? 1 : -1,
        );
        setNotifications(sorted);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [isOpen, userId]);

  const markAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const notif = notifications.find((n) => n.id === notificationId);
      if (notif?.read) return;

      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || markingAllRead) return;
    setMarkingAllRead(true);

    try {
      await markAllNotificationsAsRead(userId);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id).catch(console.error);
    }

    if (notification.link) {
      onClose();
      router.push(notification.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (createdAt: any): string => {
    if (!createdAt) return "";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return translate("notifications.justNow");
    if (diffMins < 60) return translate("notifications.agoMinutes", { count: diffMins });
    if (diffHours < 24) return translate("notifications.agoHours", { count: diffHours });
    if (diffDays < 7) return translate("notifications.agoDays", { count: diffDays });
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={translate("notifications.title")}
      description={
        unreadCount > 0
          ? translate("notifications.unreadCount", { count: unreadCount })
          : undefined
      }
      contentClassName="p-0"
      headerActions={
        unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            loading={markingAllRead}
            leadingIcon={<CheckCheck className="size-4" aria-hidden="true" />}
          >
            {translate("notifications.markAllRead")}
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="size-6 animate-spin text-brand-strong" aria-hidden="true" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-card bg-surface-raised">
            <Bell size={28} className="text-muted-fg" aria-hidden="true" />
          </div>
          <h3 className="text-body font-bold text-fg">
            {translate("notifications.emptyTitle")}
          </h3>
          <p className="mt-1 text-caption text-muted-fg">
            {translate("notifications.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors ${
                !notification.read
                  ? "bg-brand-soft/40 hover:bg-brand-soft/60"
                  : "hover:bg-surface-raised"
              }`}
            >
              <div className="shrink-0 pt-0.5">
                {notification.imageUrl ? (
                  <Avatar
                    src={notification.imageUrl}
                    name={notification.title}
                    size="md"
                  />
                ) : (
                  <div
                    className={`flex size-10 items-center justify-center rounded-control border border-line ${
                      !notification.read ? "bg-surface" : "bg-surface-raised"
                    }`}
                  >
                    {getIcon(notification.type as NotificationType)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {!notification.read && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-brand-strong"
                        aria-hidden="true"
                      />
                    )}
                    <p
                      className={`truncate text-label ${
                        !notification.read ? "font-bold text-fg" : "font-semibold text-fg"
                      }`}
                    >
                      {notification.title}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={(e) => markAsRead(notification.id, e)}
                      aria-label={translate("notifications.markAsRead")}
                      title={translate("notifications.markAsRead")}
                      className="-my-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <CheckCircle size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted-fg">
                  {notification.message}
                </p>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-caption tabular-nums text-muted-fg">
                    {formatTime(notification.createdAt)}
                  </span>
                  {notification.link && (
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-brand-strong transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {translate("notifications.view")}
                      <ArrowRight size={12} aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
