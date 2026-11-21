"use client";

import React, { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { subscribeToUserFeedback } from "@/lib/feedback";
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
    const unsub = subscribeToUserFeedback((items) => {
      setFeedback(items as FeedbackItem[]);
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
      ? (feedback.reduce((a, f) => a + (f.loveScale || 0), 0) / feedback.length).toFixed(
          1,
        )
      : "0";

  const avgReferral =
    feedback.length > 0
      ? (
          feedback.reduce((a, f) => a + (f.referralLikelihood || 0), 0) / feedback.length
        ).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-line pb-6">
          <p className="text-caption font-semibold text-brand-strong">Feedback</p>
          <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
            Creator feedback
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Ratings and suggestions submitted from the studio.
          </p>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="mb-1.5 flex items-center gap-2 text-caption font-semibold text-muted-fg">
              <MessageSquare size={15} className="text-info" aria-hidden="true" />
              Total responses
            </div>
            <p className="text-title font-bold tabular-nums text-fg">{feedback.length}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="mb-1.5 flex items-center gap-2 text-caption font-semibold text-muted-fg">
              <Star size={15} className="text-warning" aria-hidden="true" />
              Avg satisfaction
            </div>
            <p className="text-title font-bold tabular-nums text-fg">{avgLoveScale} / 5</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="mb-1.5 flex items-center gap-2 text-caption font-semibold text-muted-fg">
              <ThumbsUp size={15} className="text-success" aria-hidden="true" />
              Avg recommendation
            </div>
            <p className="text-title font-bold tabular-nums text-fg">{avgReferral} / 5</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-fg"
            size={17}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search by handle or message…"
            className="w-full rounded-control border border-line bg-surface py-2.5 pl-10 pr-4 text-label text-fg outline-none focus:border-focus"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-fg">
              <Loader2 className="mb-3 animate-spin" size={32} />
              <p className="text-label font-medium">Loading feedback…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-label text-muted-fg">
              {search ? "No feedback matches your search." : "No feedback yet."}
            </div>
          ) : (
            <div className="divide-y divide-line">
              {filtered.map((item) => (
                <div key={item.id} className="p-5 transition-colors hover:bg-surface-raised/50">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-control border border-line bg-surface-raised text-muted-fg">
                        <User size={16} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-label font-bold text-fg">
                          @{item.handle || "anonymous"}
                        </p>
                        <p className="flex items-center gap-1 text-caption tabular-nums text-muted-fg">
                          <Clock size={11} aria-hidden="true" />
                          {item.createdAt?.toDate().toLocaleString() || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-caption font-semibold tabular-nums text-muted-fg">
                      <span className="inline-flex items-center gap-1 text-fg">
                        <Star size={12} className="text-warning" aria-hidden="true" />
                        Satisfaction {item.loveScale ?? "—"}/5
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-fg">
                        <ThumbsUp size={12} className="text-success" aria-hidden="true" />
                        Refer {item.referralLikelihood ?? "—"}/5
                      </span>
                    </div>
                  </div>
                  {item.message && (
                    <p className="ml-[52px] text-label leading-relaxed text-muted-fg">
                      {item.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
