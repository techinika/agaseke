/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import {
  fetchBroadcastRecipients,
  subscribeToAdminBroadcasts,
} from "@/lib/adminCommsService";
import {
  Send,
  Users,
  UserCheck,
  ShieldCheck,
  Loader,
  ShieldAlert,
  History,
  Eye,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminComms() {
  const [target, setTarget] = useState<"all" | "creators" | "verified" | "not-verified">(
    "all",
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAdminBroadcasts(setHistory);
    return () => unsubscribe();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return toast.error("Please fill all fields");

    setSending(true);
    try {
      const recipients = await fetchBroadcastRecipients(target);
      const recipientIds = recipients.map((r) => r.uid);

      if (recipients.length === 0) {
        setSending(false);
        return toast.error("No recipients found in this category.");
      }

      const res = await sendCommsEmail("broadcast", {
        recipients,
        recipientIds,
        subject,
        message,
        targetLabel: target.toUpperCase(),
      });

      if (res.success) {
        toast.success(`Success! Broadcast sent to ${recipients.length} users.`);
        setSubject("");
        setMessage("");
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error launching broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-caption font-semibold text-brand-strong">Communication</p>
            <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
              Broadcast announcements
            </h1>
            <p className="mt-1 text-label text-muted-fg">
              Draft and dispatch platform-wide notices and emails.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-control border border-line bg-surface px-3.5 py-2.5 text-caption text-muted-fg">
            <Info size={16} className="shrink-0 text-info" aria-hidden="true" />
            <span>Use [NAME] or [HANDLE] to personalize messages.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSend}
              className="space-y-6 rounded-card border border-line bg-surface p-6 sm:p-8"
            >
              <div>
                <label className="mb-3 block text-caption font-semibold text-muted-fg">
                  1. Target audience
                </label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { id: "all", label: "All Users", icon: <Users size={16} /> },
                    { id: "creators", label: "Creators", icon: <UserCheck size={16} /> },
                    { id: "verified", label: "Verified", icon: <ShieldCheck size={16} /> },
                    { id: "not-verified", label: "Unverified", icon: <ShieldAlert size={16} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTarget(item.id as any)}
                      className={`flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-control border p-3 text-caption font-semibold transition-colors ${
                        target === item.id
                          ? "border-brand-strong bg-brand-soft text-brand-strong"
                          : "border-line bg-surface-raised text-muted-fg hover:text-fg"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-muted-fg">
                    2. Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Updates for [NAME]"
                    className="w-full rounded-control border border-line bg-surface px-3.5 py-2.5 text-label text-fg outline-none focus:border-focus"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-muted-fg">
                    3. Message
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hello [NAME], we have news regarding @[HANDLE]..."
                    className="h-72 w-full resize-none rounded-control border border-line bg-surface p-4 text-label leading-relaxed text-fg outline-none focus:border-focus"
                  />
                </div>
              </div>

              <button
                disabled={sending}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-brand-strong px-5 py-3 text-label font-semibold text-on-brand transition-colors hover:bg-brand disabled:opacity-50"
              >
                {sending ? <Loader className="size-4 animate-spin" /> : <Send size={16} />}
                {sending ? "Sending broadcast…" : "Send broadcast"}
              </button>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center gap-2 px-1 text-fg">
              <History size={16} className="text-brand-strong" aria-hidden="true" />
              <h2 className="text-body font-bold">Recent broadcasts</h2>
            </div>

            <div className="max-h-[760px] space-y-3 overflow-y-auto">
              {history.length === 0 ? (
                <div className="rounded-card border border-line bg-surface p-8 text-center">
                  <p className="text-label text-muted-fg">No broadcasts sent yet.</p>
                </div>
              ) : (
                history.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-card border border-line bg-surface p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 text-caption">
                      <span
                        className={`font-semibold ${
                          log.status === "success" ? "text-success" : "text-danger"
                        }`}
                      >
                        {log.targetLabel || "GENERAL"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreview(log)}
                        aria-label="Preview broadcast"
                        className="rounded p-1 text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                    <h3 className="truncate text-label font-bold text-fg">{log.subject}</h3>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-caption tabular-nums text-muted-fg">
                      <span>{log.sentAt?.toDate().toLocaleDateString("en-GB")}</span>
                      <span className="font-semibold text-fg">{log.sentCount} users</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-surface p-6 shadow-float">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="text-title font-bold text-fg">Broadcast archive</h2>
                <p className="mt-0.5 text-caption tabular-nums text-muted-fg">
                  Sent to {preview.sentCount} recipients
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="flex size-10 items-center justify-center rounded-control border border-line bg-surface-raised text-muted-fg transition-colors hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto">
              <div className="rounded-control border border-line bg-surface-raised p-4">
                <p className="mb-1 text-caption font-semibold text-muted-fg">Subject</p>
                <p className="font-bold text-fg">{preview.subject}</p>
              </div>

              <div className="rounded-control border border-line bg-surface p-5">
                <p className="mb-2 text-caption font-semibold text-muted-fg">Message</p>
                <div className="whitespace-pre-wrap text-label leading-relaxed text-fg">
                  {preview.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
