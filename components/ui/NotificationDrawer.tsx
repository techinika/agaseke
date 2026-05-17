/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
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
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/db/firebase";
import type { Notification, NotificationType } from "@/lib/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const iconMap: Record<NotificationType, React.ReactNode> = {
  support_received: <Heart size={18} className="text-red-500" />,
  new_sale: <ShoppingBag size={18} className="text-orange-500" />,
  new_order: <Package size={18} className="text-blue-500" />,
  verification_approved: <CheckCircle size={18} className="text-green-500" />,
  verification_rejected: <XCircle size={18} className="text-red-500" />,
  new_message: <MessageSquare size={18} className="text-blue-500" />,
  new_content: <FileText size={18} className="text-purple-500" />,
  new_product: <Store size={18} className="text-amber-500" />,
  new_gathering: <Calendar size={18} className="text-teal-500" />,
  new_giveaway: <Gift size={18} className="text-pink-500" />,
  booking_request: <CalendarClock size={18} className="text-indigo-500" />,
  booking_accepted: <CheckCircle size={18} className="text-green-500" />,
  booking_declined: <XCircle size={18} className="text-red-500" />,
  payout_processed: <Wallet size={18} className="text-emerald-500" />,
  broadcast_received: <Megaphone size={18} className="text-orange-500" />,
  new_user: <UserPlus size={18} className="text-blue-500" />,
  new_creator: <UserCheck size={18} className="text-green-500" />,
  new_transaction: <CreditCard size={18} className="text-purple-500" />,
  withdrawal: <Wallet size={18} className="text-orange-500" />,
};

const getIcon = (type: NotificationType): React.ReactNode => {
  return iconMap[type] || <Bell size={18} className="text-slate-500" />;
};

export default function NotificationDrawer({
  isOpen,
  onClose,
  userId,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen || !userId) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, userId]);

  const markAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const notif = notifications.find((n) => n.id === notificationId);
      if (notif?.read) return;

      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || markingAllRead) return;
    setMarkingAllRead(true);

    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      updateDoc(doc(db, "notifications", notification.id), { read: true }).catch(
        console.error
      );
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Bell size={20} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-500">
                    {unreadCount} unread
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={markingAllRead}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {markingAllRead ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader className="w-6 h-6 text-orange-600 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Bell size={28} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">
                  No notifications yet
                </h3>
                <p className="text-xs text-slate-500">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-6 py-4 transition-colors cursor-pointer group ${
                      !notification.read
                        ? "bg-orange-50/50 hover:bg-orange-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            !notification.read ? "bg-white shadow-sm" : "bg-slate-50"
                          }`}
                        >
                          {notification.imageUrl ? (
                            <img
                              src={notification.imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            getIcon(notification.type as NotificationType)
                          )}
                        </div>
                        {!notification.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm ${
                              !notification.read
                                ? "font-bold text-slate-900"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={(e) => markAsRead(notification.id, e)}
                              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.link && (
                            <span className="text-[10px] text-orange-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ArrowRight size={10} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

