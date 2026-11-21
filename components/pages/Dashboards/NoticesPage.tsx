/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, Calendar } from "lucide-react";
import { markNotificationAsRead, subscribeToBroadcastNotices } from "@/lib/notifications";
import { useAuth } from "@/auth/AuthContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/cn";

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
  const { user, profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const subscriptionKey = user?.uid ? `${user.uid}:${retryKey}` : null;
  const loading = Boolean(subscriptionKey) && loadedKey !== subscriptionKey;

  useEffect(() => {
    if (!user?.uid || !subscriptionKey) return;

    const unsubscribe = subscribeToBroadcastNotices(
      user.uid,
      (items) => {
        setNotices(items as unknown as Notice[]);
        setLoadedKey(subscriptionKey);
        setLoadError(false);
      },
      (err) => {
        console.error("Failed to load broadcast notices:", err);
        setLoadError(true);
        setLoadedKey(subscriptionKey);
      },
    );

    return () => unsubscribe();
  }, [user?.uid, subscriptionKey]);

  const filteredNotices =
    filter === "unread" ? notices.filter((notice) => !notice.read) : notices;
  const unreadCount = notices.filter((notice) => !notice.read).length;

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

  const personalizeMessage = (message: string) => {
    const name = profile?.displayName || user?.displayName || "there";
    const handle = profile?.username || "";
    return message.replace(/\[NAME\]/g, name).replace(/\[HANDLE\]/g, handle);
  };

  const openNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    if (!notice.read) {
      void markNotificationAsRead(notice.id).catch(() => {});
    }
  };

  if (loading) {
    return <LoadingState variant="list" />;
  }

  return (
    <div className="bg-canvas pb-10 text-fg">
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-8">
        <PageHeader
          title="Notices"
          description="Important announcements from the admin team."
          eyebrow="Inbox"
          actions={
            unreadCount > 0 ? (
              <span className="text-label font-semibold tabular-nums text-brand-strong">
                {unreadCount} unread
              </span>
            ) : undefined
          }
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "primary" : "secondary"}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All notices
          </Button>
          <Button
            size="sm"
            variant={filter === "unread" ? "primary" : "secondary"}
            aria-pressed={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        <div className="mt-6">
          {loadError ? (
            <ErrorState
              title="Couldn't load notices"
              description="Check your connection and try again."
              onRetry={() => setRetryKey((n) => n + 1)}
            />
          ) : filteredNotices.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-6" aria-hidden="true" />}
              title="No notices yet"
              description="When the admin sends announcements, they will appear here."
              className="py-16"
            />
          ) : (
            <div className="space-y-3">
              {filteredNotices.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => openNotice(notice)}
                  className={cn(
                    "w-full rounded-card border border-line bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    !notice.read && "bg-brand-soft/30",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-control",
                          notice.read
                            ? "bg-surface-raised text-muted-fg"
                            : "bg-brand-soft text-brand-strong",
                        )}
                      >
                        <Megaphone className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-fg">
                          <h2
                            className={cn(
                              "text-body font-bold",
                              notice.read ? "text-fg" : "text-fg",
                            )}
                          >
                            {notice.title}
                          </h2>
                          {!notice.read && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-brand-strong">Unread</span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 max-w-2xl text-label leading-relaxed text-muted-fg">
                          {personalizeMessage(notice.message)}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-caption tabular-nums text-muted-fg">
                      <Calendar className="size-3.5" aria-hidden="true" />
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!selectedNotice}
        onClose={() => setSelectedNotice(null)}
        title={selectedNotice?.title ?? "Notice"}
        description="Admin announcement"
        size="lg"
      >
        {selectedNotice && (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-caption tabular-nums text-muted-fg">
              <span>{selectedNotice.read ? "Read" : "Unread"}</span>
              <span aria-hidden="true">·</span>
              <Calendar className="size-3.5" aria-hidden="true" />
              <span>{formatDate(selectedNotice.createdAt)}</span>
            </p>
            <Card className="bg-surface-sunken p-5">
              <p className="whitespace-pre-wrap text-label leading-relaxed text-fg">
                {personalizeMessage(selectedNotice.message)}
              </p>
            </Card>
          </div>
        )}
      </Dialog>
    </div>
  );
}
