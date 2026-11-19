/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, Bell, Calendar } from "lucide-react";
import { subscribeToBroadcastNotices } from "@/lib/notifications";
import { useAuth } from "@/auth/AuthContext";
import Loading from "@/app/loading";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBroadcastNotices(user.uid, (items) => {
      setNotices(items as unknown as Notice[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-canvas pb-8 text-fg">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <PageHeader
          title="Notices"
          description="Important announcements from the admin team."
          eyebrow="Inbox"
          actions={
            unreadCount > 0 ? (
              <Badge tone="brand" className="gap-2 px-3 py-2">
                <Bell className="size-4" aria-hidden="true" />
                {unreadCount} unread
              </Badge>
            ) : undefined
          }
        />

        <div className="mt-8 flex flex-wrap gap-3">
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
          {filteredNotices.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-6" aria-hidden="true" />}
              title="No notices yet"
              description="When the admin sends announcements, they will appear here."
              className="py-16"
            />
          ) : (
            <div className="space-y-4">
              {filteredNotices.map((notice) => (
                <Button
                  key={notice.id}
                  variant="secondary"
                  fullWidth
                  onClick={() => setSelectedNotice(notice)}
                  className={cn(
                    "flex-col items-stretch justify-start px-5 py-5 text-left",
                    !notice.read && "shadow-sm",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-control",
                          notice.read
                            ? "bg-surface-raised text-muted-fg"
                            : "bg-brand-soft text-brand-strong",
                        )}
                      >
                        <Megaphone className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={cn(
                              "text-body-lg font-bold",
                              notice.read ? "text-muted-fg" : "text-fg",
                            )}
                          >
                            {notice.title}
                          </h2>
                          {!notice.read && <Badge tone="brand">NEW</Badge>}
                        </div>
                        <p className="mt-1 max-w-2xl text-label leading-relaxed text-muted-fg">
                          {personalizeMessage(notice.message)}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-caption font-medium text-muted-fg">
                      <Calendar className="size-4" aria-hidden="true" />
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>
                </Button>
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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {selectedNotice.read ? (
                <Badge>Read</Badge>
              ) : (
                <Badge tone="brand">NEW</Badge>
              )}
              <span className="flex items-center gap-2 text-caption font-medium text-muted-fg">
                <Calendar className="size-4" aria-hidden="true" />
                {formatDate(selectedNotice.createdAt)}
              </span>
            </div>
            <Card className="bg-surface-sunken p-5">
              <p className="whitespace-pre-wrap text-label font-medium leading-relaxed text-fg">
                {personalizeMessage(selectedNotice.message)}
              </p>
            </Card>
          </div>
        )}
      </Dialog>
    </div>
  );
}
