"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, MessageSquare, ScrollText } from "lucide-react";
import { Tabs } from "@/components/ui";
import AdminComms from "./AdminCommunication";
import AdminChangelogPage from "./AdminChangelogPage";
import AdminFeedbackPage from "./AdminFeedbackPage";

const COMMS_TABS = ["broadcast", "changelog", "feedback"] as const;

type CommsTabId = (typeof COMMS_TABS)[number];

export default function AdminCommsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab: CommsTabId = COMMS_TABS.includes(tabFromUrl as CommsTabId)
    ? (tabFromUrl as CommsTabId)
    : "broadcast";

  const handleTabChange = (nextTab: string) => {
    const validTab: CommsTabId = COMMS_TABS.includes(nextTab as CommsTabId)
      ? (nextTab as CommsTabId)
      : "broadcast";
    const params = new URLSearchParams(searchParams.toString());
    if (validTab === "broadcast") {
      params.delete("tab");
    } else {
      params.set("tab", validTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/comms?${qs}` : "/admin/comms", {
      scroll: false,
    });
  };

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-caption font-semibold text-brand-strong">Outreach</p>
          <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
            Comms
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Send platform broadcasts, maintain the product changelog, and review creator feedback.
          </p>
        </header>

        <Tabs
          ariaLabel="Comms sections"
          variant="underline"
          className="mb-8"
          value={activeTab}
          onChange={handleTabChange}
          items={[
            { id: "broadcast", label: "Broadcast", icon: <Megaphone size={16} /> },
            { id: "changelog", label: "Changelog", icon: <ScrollText size={16} /> },
            { id: "feedback", label: "Feedback", icon: <MessageSquare size={16} /> },
          ]}
        />

        {activeTab === "broadcast" && <AdminComms embedded />}
        {activeTab === "changelog" && <AdminChangelogPage embedded />}
        {activeTab === "feedback" && <AdminFeedbackPage embedded />}
      </div>
    </div>
  );
}
