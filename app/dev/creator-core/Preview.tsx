"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";

export type CreatorCoreSurface = "home" | "payouts" | "settings" | "sales" | "supporters";

export interface CreatorCorePreviewProps {
  surface: CreatorCoreSurface;
  dialog?: string;
}

const SURFACES: Array<{ id: CreatorCoreSurface; label: string }> = [
  { id: "home", label: "Home" },
  { id: "payouts", label: "Payouts" },
  { id: "settings", label: "Settings" },
  { id: "sales", label: "Sales" },
  { id: "supporters", label: "Supporters" },
];

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-caption font-bold uppercase tracking-wide text-muted-fg">
        {label}
      </p>
      <p className="mt-2 text-heading font-bold text-fg">{value}</p>
      <p className="mt-1 text-caption text-muted-fg">{hint}</p>
    </Card>
  );
}

function HomeSurface() {
  const checklist = [
    { label: "Profile complete", done: true },
    { label: "Payout details added", done: true },
    { label: "Identity verified", done: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Creator workspace"
        title="Good morning, Aline"
        description="Your creator dashboard, built with the shared design system."
        actions={
          <Button leadingIcon={<Share2 className="size-4" aria-hidden="true" />}>
            Share my link
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Supporters" value="248" hint="+12 this month" />
        <StatCard label="Available" value="145,000 RWF" hint="Ready to withdraw" />
        <StatCard label="Store orders" value="36" hint="8 need attention" />
      </div>
      <Card className="p-4">
        <h2 className="text-title font-bold text-fg">Set up your creator space</h2>
        <div className="mt-4 space-y-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-control bg-surface-sunken px-3 py-2"
            >
              <span className="text-body text-fg">{item.label}</span>
              <Badge tone={item.done ? "success" : "warning"}>
                {item.done ? "Complete" : "Action needed"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PayoutSurface() {
  const [tab, setTab] = useState("overview");
  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "History", badge: 3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Earnings"
        title="Payouts"
        description="Review your balance, request a withdrawal, and track payout history."
        actions={<Button>Request withdrawal</Button>}
      />
      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Payout sections" />
      {tab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Available balance"
            value="145,000 RWF"
            hint="Across 2 currencies"
          />
          <StatCard label="Pending" value="28,500 RWF" hint="Clears in 3 days" />
          <Card className="p-4 sm:col-span-2">
            <h2 className="text-title font-bold text-fg">Withdrawal quote</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FormField
                id="preview-amount"
                label="Amount"
                hint="In major currency units"
              >
                <Input id="preview-amount" inputMode="decimal" defaultValue="50000" />
              </FormField>
              <Select id="preview-currency" label="Payout currency" defaultValue="RWF">
                <option value="RWF">RWF — Rwandan Franc</option>
                <option value="USD">USD — US Dollar</option>
              </Select>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="divide-y divide-line p-0">
          {["WDL-1042", "WDL-1041", "WDL-1040"].map((id) => (
            <div key={id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-fg">{id}</p>
                <p className="text-caption text-muted-fg">Paid to MTN MoMo</p>
              </div>
              <Badge tone="success">Paid</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function SettingsSurface() {
  const [messaging, setMessaging] = useState(true);
  const [store, setStore] = useState(false);
  const [tab, setTab] = useState("profile");
  const tabs: TabItem[] = [
    { id: "profile", label: "Profile" },
    { id: "payout", label: "Payout" },
    { id: "features", label: "Features" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your public profile, payout destination, and creator features."
        actions={<Button>Save changes</Button>}
      />
      <Tabs items={tabs} value={tab} onChange={setTab} ariaLabel="Settings sections" />
      {tab === "features" ? (
        <Card className="space-y-2 p-4">
          <Switch
            checked={messaging}
            onCheckedChange={setMessaging}
            label="Messaging"
            description="Let supporters send you direct messages."
          />
          <Switch
            checked={store}
            onCheckedChange={setStore}
            label="Store"
            description="Sell products and bundles from your page."
          />
        </Card>
      ) : (
        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          <FormField id="preview-name" label="Display name">
            <Input id="preview-name" defaultValue="Aline Uwase" />
          </FormField>
          <FormField id="preview-handle" label="Handle">
            <Input id="preview-handle" defaultValue="aline" />
          </FormField>
          <Select id="preview-country" label="Country" defaultValue="RW">
            <option value="RW">Rwanda</option>
            <option value="KE">Kenya</option>
          </Select>
          <Select id="preview-currency" label="Primary currency" defaultValue="RWF">
            <option value="RWF">RWF</option>
            <option value="USD">USD</option>
          </Select>
          <FormField id="preview-bio" label="Bio" className="sm:col-span-2">
            <Textarea id="preview-bio" rows={3} defaultValue="Sharing Rwandan stories." />
          </FormField>
        </Card>
      )}
    </div>
  );
}

const SALES = [
  { id: "ORD-2041", buyer: "Jean Paul", product: "Studio session", total: "25,000 RWF" },
  { id: "ORD-2040", buyer: "Marie Claire", product: "Photo pack", total: "12,000 RWF" },
  { id: "ORD-2039", buyer: "Anonymous", product: "Support tier", total: "5,000 RWF" },
];

function SalesSurface() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Commerce"
        title="Sales"
        description="Orders and earnings from your store, tiered, and one-off support."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Orders" value="36" hint="Last 30 days" />
        <StatCard label="Products" value="12" hint="4 low on stock" />
        <StatCard label="Revenue" value="482,000 RWF" hint="Across 2 currencies" />
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            aria-label="Search sales"
            placeholder="Search sales"
            className="sm:max-w-xs"
          />
          <Select id="preview-period" aria-label="Time period" defaultValue="month">
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 12 months</option>
          </Select>
        </div>
        <div className="space-y-2">
          {SALES.map((sale) => (
            <div
              key={sale.id}
              className="flex flex-col gap-2 rounded-control border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar name={sale.buyer} size="sm" />
                <div>
                  <p className="font-semibold text-fg">{sale.buyer}</p>
                  <p className="text-caption text-muted-fg">
                    {sale.id} · {sale.product}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-fg">{sale.total}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const SUPPORTERS = [
  { name: "Jean Paul", tier: "Inner Circle", total: "85,000 RWF" },
  { name: "Marie Claire", tier: "Supporter", total: "42,000 RWF" },
  { name: "Anonymous", tier: "One-off", total: "18,000 RWF" },
];

function SupportersSurface({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Supporters"
        description="See who supports your work and send updates to your community."
        actions={<Button onClick={() => onOpenChange(true)}>Send broadcast</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Supporters" value="248" hint="12 new this month" />
        <StatCard label="Registered" value="196" hint="Can be messaged" />
        <StatCard label="Anonymous" value="52" hint="Aggregate only" />
      </div>
      <Card className="space-y-3 p-4">
        <SearchInput aria-label="Search supporters" placeholder="Search supporters" />
        <div className="space-y-2">
          {SUPPORTERS.map((supporter) => (
            <div
              key={supporter.name}
              className="flex items-center justify-between gap-3 rounded-control border border-line p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={supporter.name} size="sm" />
                <div>
                  <p className="font-semibold text-fg">{supporter.name}</p>
                  <p className="text-caption text-muted-fg">{supporter.tier}</p>
                </div>
              </div>
              <p className="font-semibold text-fg">{supporter.total}</p>
            </div>
          ))}
        </div>
      </Card>
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        title="Send a broadcast"
        description="This preview uses the shared dialog primitive."
        footer={<Button onClick={() => onOpenChange(false)}>Send update</Button>}
      >
        <div className="space-y-4">
          <FormField id="preview-subject" label="Subject">
            <Input id="preview-subject" defaultValue="New studio diary" />
          </FormField>
          <FormField id="preview-message" label="Message">
            <Textarea
              id="preview-message"
              rows={4}
              defaultValue="Thank you for supporting my work."
            />
          </FormField>
        </div>
      </Dialog>
    </div>
  );
}

export function CreatorCorePreview({ surface, dialog }: CreatorCorePreviewProps) {
  const [broadcastOpen, setBroadcastOpen] = useState(dialog === "broadcast");

  const topbar = (
    <div className="mx-auto flex w-full max-w-app flex-wrap items-center gap-1 px-4 py-3 sm:px-6">
      <span className="mr-3 text-body font-bold tracking-wide text-fg">AGASEKE</span>
      <nav
        aria-label="Preview surfaces"
        className="no-scrollbar flex gap-1 overflow-x-auto"
      >
        {SURFACES.map((item) => (
          <a
            key={item.id}
            href={`/dev/creator-core?surface=${item.id}`}
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
        <Badge tone="brand">Preview</Badge>
        Mock data only. No Firebase reads or writes.
      </div>
      {surface === "home" && <HomeSurface />}
      {surface === "payouts" && <PayoutSurface />}
      {surface === "settings" && <SettingsSurface />}
      {surface === "sales" && <SalesSurface />}
      {surface === "supporters" && (
        <SupportersSurface open={broadcastOpen} onOpenChange={setBroadcastOpen} />
      )}
    </AppShell>
  );
}
