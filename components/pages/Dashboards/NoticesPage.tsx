/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { Megaphone, Bell, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

interface Notice {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: {
    targetLabel?: string;
    recipientsCount?: number;
  };
}

export default function NoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("type", "==", "broadcast_received"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const noticesData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notice[];
      setNotices(noticesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredNotices = filter === "unread" 
    ? notices.filter(n => !n.read)
    : notices;

  const unreadCount = notices.filter(n => !n.read).length;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-4xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Megaphone className="text-orange-600" size={28} />
              <h1 className="text-4xl font-black uppercase tracking-tight">
                Notices
              </h1>
            </div>
            <p className="text-slate-500 font-medium">
              Important announcements from the admin team.
            </p>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
              <Bell size={16} />
              <span className="text-sm font-bold">{unreadCount} unread</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            All Notices
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              filter === "unread"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center">
            <Megaphone className="text-slate-300 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No notices yet</h3>
            <p className="text-slate-400 font-medium">
              When the admin sends announcements, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                className={`bg-white border-2 rounded-2xl p-6 transition-all ${
                  notice.read 
                    ? "border-slate-100" 
                    : "border-orange-200 shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      notice.read ? "bg-slate-100" : "bg-orange-100"
                    }`}>
                      <Megaphone size={20} className={
                        notice.read ? "text-slate-400" : "text-orange-600"
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-lg ${
                          notice.read ? "text-slate-600" : "text-slate-900"
                        }`}>
                          {notice.title}
                        </h3>
                        {!notice.read && (
                          <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
                        {notice.message}
                      </p>
                      {notice.metadata?.targetLabel && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            {notice.metadata.targetLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {notice.metadata.recipientsCount} recipients
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={14} />
                    <span className="text-xs font-medium">
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}