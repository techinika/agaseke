"use client";

import { useState } from "react";
import { ArrowLeft, Bell, MessageCircle, Paperclip, Send, Users } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";

export type CreatorCommunitySurface = "community" | "chat" | "messages" | "notices";

export interface CreatorCommunityPreviewProps {
  surface: CreatorCommunitySurface;
  dialog?: string;
}

const SURFACES: Array<{ id: CreatorCommunitySurface; label: string }> = [
  { id: "community", label: "Community" },
  { id: "chat", label: "Chat" },
  { id: "messages", label: "Messages" },
  { id: "notices", label: "Notices" },
];

const TIERS = [
  { name: "Inner Circle", price: "15,000 RWF", members: 42, benefits: "3 benefits" },
  { name: "Supporter", price: "5,000 RWF", members: 118, benefits: "2 benefits" },
];

function CommunitySurface() {
  const [enabled, setEnabled] = useState(true);
  const [tab, setTab] = useState("tiers");
  const tabs: TabItem[] = [
    { id: "tiers", label: "Tiers" },
    { id: "members", label: "Members", badge: 160 },
    { id: "earnings", label: "Earnings" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Creator community"
        title="Community"
        description="Manage membership tiers, members, and community earnings."
        actions={<Button>Add tier</Button>}
      />
      <Card className="p-4">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          label="Community access"
          description="Let supporters join paid tiers from your public page."
        />
      </Card>
      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Community sections" />
      {tab === "members" ? (
        <Card className="divide-y divide-line p-0">
          {["Jean Paul", "Marie Claire", "Aline Uwase"].map((name) => (
            <div key={name} className="flex items-center gap-3 p-4">
              <Avatar name={name} size="sm" />
              <p className="font-semibold text-fg">{name}</p>
              <Badge tone="success" className="ml-auto">
                Active
              </Badge>
            </div>
          ))}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <Card key={tier.name} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-title font-bold text-fg">{tier.name}</h2>
                  <p className="text-caption text-muted-fg">{tier.benefits}</p>
                </div>
                <Badge tone="brand">{tier.price}</Badge>
              </div>
              <p className="text-body text-muted-fg">{tier.members} members</p>
              <Button variant="secondary" size="sm">
                Edit tier
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const MESSAGES = [
  {
    name: "Jean Paul",
    role: "Inner Circle",
    text: "Loved the latest studio diary!",
    time: "09:41",
  },
  {
    name: "Marie Claire",
    role: "Supporter",
    text: "Thank you for the update.",
    time: "Yesterday",
  },
  { name: "Anonymous", role: "One-off", text: "Can I request a song?", time: "Tuesday" },
];

function ChatSurface() {
  return (
    <Card className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <IconButton
          label="Back to community"
          icon={<ArrowLeft className="size-4" aria-hidden="true" />}
        />
        <Avatar name="Inner Circle" size="sm" />
        <div>
          <h2 className="font-semibold text-fg">Inner Circle</h2>
          <p className="text-caption text-muted-fg">42 members</p>
        </div>
        <Badge tone="brand" className="ml-auto">
          Tier chat
        </Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="max-w-[85%] rounded-card bg-surface-sunken p-3">
          <p className="text-caption font-bold text-fg">Aline</p>
          <p className="text-body text-fg">Welcome to the Inner Circle chat.</p>
        </div>
        <div className="ml-auto max-w-[85%] rounded-card bg-brand-strong p-3 text-on-brand">
          <p className="text-caption font-bold">You</p>
          <p className="text-body">Thank you for having me.</p>
        </div>
      </div>
      <form className="flex items-end gap-2 border-t border-line p-3">
        <FormField
          id="preview-chat-message"
          label="Message to Inner Circle"
          className="min-w-0 flex-1"
        >
          <Input id="preview-chat-message" placeholder="Write a message" />
        </FormField>
        <IconButton
          label="Attach file"
          icon={<Paperclip className="size-4" aria-hidden="true" />}
          variant="secondary"
          type="button"
        />
        <IconButton
          label="Send message"
          icon={<Send className="size-4" aria-hidden="true" />}
          type="button"
        />
      </form>
    </Card>
  );
}

function MessagesSurface() {
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState("all");
  const tabs: TabItem[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread", badge: 2 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Direct conversations with your supporters."
      />
      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Message filters" />
      <div className="grid gap-3 lg:grid-cols-[20rem_1fr]">
        <Card className="space-y-3 p-3">
          <SearchInput aria-label="Search messages" placeholder="Search messages" />
          <div className="space-y-1">
            {MESSAGES.map((message, index) => (
              <button
                type="button"
                key={message.name}
                onClick={() => setSelected(index)}
                aria-current={selected === index ? "true" : undefined}
                className="flex min-h-14 w-full items-center gap-3 rounded-control p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Avatar name={message.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-fg">{message.name}</span>
                    <span className="shrink-0 text-caption text-muted-fg">
                      {message.time}
                    </span>
                  </span>
                  <span className="block truncate text-caption text-muted-fg">
                    {message.text}
                  </span>
                  <span className="text-caption text-brand-strong">{message.role}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex min-h-[28rem] flex-col p-4">
          <div className="flex items-center gap-3 border-b border-line pb-3">
            <Avatar name={MESSAGES[selected]?.name} size="sm" />
            <div>
              <p className="font-semibold text-fg">{MESSAGES[selected]?.name}</p>
              <p className="text-caption text-muted-fg">{MESSAGES[selected]?.role}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<MessageCircle className="size-6" aria-hidden="true" />}
              title="Select a conversation"
              description="Choose a supporter from the list to read the full thread."
            />
          </div>
          <FormField id="preview-reply" label="Reply" className="pt-3">
            <Textarea id="preview-reply" rows={2} placeholder="Write a reply" />
          </FormField>
        </Card>
      </div>
    </div>
  );
}

const NOTICES = [
  {
    title: "New membership tier",
    audience: "All supporters",
    status: "Sent",
    date: "12 Nov",
  },
  {
    title: "Studio diary is live",
    audience: "Inner Circle",
    status: "Sent",
    date: "05 Nov",
  },
  {
    title: "December gathering",
    audience: "All supporters",
    status: "Draft",
    date: "01 Nov",
  },
];

function NoticesSurface({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Broadcast"
        title="Notices"
        description="Announcements sent to your community."
        actions={<Button>New notice</Button>}
      />
      {open ? (
        <Card className="space-y-3 p-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : (
        <Card className="divide-y divide-line p-0">
          {NOTICES.map((notice) => (
            <button
              type="button"
              key={notice.title}
              onClick={() => onOpenChange(true)}
              className="flex min-h-14 w-full flex-col gap-1 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="block font-semibold text-fg">{notice.title}</span>
                <span className="block text-caption text-muted-fg">
                  {notice.audience} · {notice.date}
                </span>
              </span>
              <Badge tone={notice.status === "Sent" ? "success" : "warning"}>
                {notice.status}
              </Badge>
            </button>
          ))}
        </Card>
      )}
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        title="Notice preview"
        description="Shared dialog and card primitives."
        footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
      >
        <Card className="bg-surface-sunken p-4">
          <p className="font-semibold text-fg">New membership tier</p>
          <p className="mt-1 text-body text-muted-fg">
            This preview uses mock data only.
          </p>
        </Card>
      </Dialog>
    </div>
  );
}

export function CreatorCommunityPreview({
  surface,
  dialog,
}: CreatorCommunityPreviewProps) {
  const [noticeOpen, setNoticeOpen] = useState(dialog === "notice");

  const topbar = (
    <div className="mx-auto flex w-full max-w-app flex-wrap items-center gap-1 px-4 py-3 sm:px-6">
      <span className="mr-3 text-body font-bold tracking-wide text-fg">AGASEKE</span>
      <nav
        aria-label="Community preview surfaces"
        className="no-scrollbar flex gap-1 overflow-x-auto"
      >
        {SURFACES.map((item) => (
          <a
            key={item.id}
            href={`/dev/creator-community?surface=${item.id}`}
            aria-current={item.id === surface ? "page" : undefined}
            className={buttonClasses({
              variant: item.id === surface ? "primary" : "ghost",
              size: "sm",
            })}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );

  return (
    <AppShell topbar={topbar} width="wide">
      <div className="mb-4 flex items-center gap-2 rounded-control border border-line bg-surface-sunken px-3 py-2 text-caption text-muted-fg">
        <Badge tone="brand">Phase 6B preview</Badge>
        <Users className="size-4" aria-hidden="true" />
        <Bell className="size-4" aria-hidden="true" />
        Mock data only. No Firebase reads or writes.
      </div>
      {surface === "community" && <CommunitySurface />}
      {surface === "chat" && <ChatSurface />}
      {surface === "messages" && <MessagesSurface />}
      {surface === "notices" && (
        <NoticesSurface open={noticeOpen} onOpenChange={setNoticeOpen} />
      )}
    </AppShell>
  );
}
