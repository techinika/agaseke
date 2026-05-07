/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  Clock,
  User,
  Search,
  Loader2,
} from "lucide-react";

interface FeedbackItem {
  id: string;
  createdAt?: Timestamp;
  creatorId?: string;
  handle?: string;
  loveScale?: number;
  message?: string;
  referralLikelihood?: number;
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "userFeedback"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setFeedback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = feedback.filter(
    (f) =>
      f.handle?.toLowerCase().includes(search.toLowerCase()) ||
      f.message?.toLowerCase().includes(search.toLowerCase()),
  );

  const avgLoveScale =
    feedback.length > 0
      ? (feedback.reduce((a, f) => a + (f.loveScale || 0), 0) / feedback.length).toFixed(1)
      : "0";

  const avgReferral =
    feedback.length > 0
      ? (feedback.reduce((a, f) => a + (f.referralLikelihood || 0), 0) / feedback.length).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
            User Feedback
          </h1>
          <p className="text-slate-500 font-medium">
            Reviews and suggestions from creators.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Responses</p>
            </div>
            <p className="text-2xl font-bold">{feedback.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-amber-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Avg Love Scale</p>
            </div>
            <p className="text-2xl font-bold">{avgLoveScale} / 5</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp size={16} className="text-emerald-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Avg Referral Likelihood</p>
            </div>
            <p className="text-2xl font-bold">{avgReferral} / 5</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by handle or message..."
            className="w-full bg-white border border-slate-200 py-3 pl-12 pr-4 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-medium">Loading feedback...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center text-slate-400 font-medium">
              {search ? "No feedback matches your search." : "No feedback yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">@{item.handle || "anonymous"}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                          <Clock size={10} />
                          {item.createdAt?.toDate().toLocaleString() || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg">
                        <Star size={12} /> Love: {item.loveScale ?? "?"}/5
                      </span>
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg">
                        <ThumbsUp size={12} /> Refer: {item.referralLikelihood ?? "?"}/5
                      </span>
                    </div>
                  </div>
                  {item.message && (
                    <p className="text-slate-600 text-sm ml-[52px] leading-relaxed">
                      {item.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
