"use client";

import { useState, type ReactNode } from "react";
import { Bell, Compass, Home, Library, Settings, User } from "lucide-react";
import {
  AmountInput,
  Avatar,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  MediaImage,
  MediaPlayer,
  Money,
  PhoneInput,
  QRCode,
  ShareButton,
  Sheet,
  Skeleton,
  SkeletonText,
  StatusScreen,
  Tabs,
  TopBar,
  toast,
} from "@/components/ui";

const SWATCHES = [
  ["Brand", "bg-brand"],
  ["Brand strong", "bg-brand-strong"],
  ["Foreground", "bg-fg"],
  ["Muted text", "bg-muted-fg"],
  ["Surface", "bg-surface border border-line"],
  ["Success", "bg-success"],
  ["Warning", "bg-warning"],
  ["Danger", "bg-danger"],
  ["Info", "bg-info"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-label font-bold uppercase tracking-wide text-muted-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ComponentGallery() {
  const [amount, setAmount] = useState<number | "">(1000);
  const [phone, setPhone] = useState("");
  const [tab, setTab] = useState("home");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background pb-24 text-fg">
      <TopBar
        title="UI components"
        actions={
          <Button
            variant="ghost"
            size="sm"
            aria-label="Show toast"
            onClick={() => toast("Toast is wired up")}
          >
            <Bell className="size-5" aria-hidden="true" />
          </Button>
        }
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
        <Section title="Tokens">
          <div className="grid grid-cols-3 gap-2">
            {SWATCHES.map(([label, className]) => (
              <div key={label} className="space-y-1">
                <div className={`h-12 rounded-control ${className}`} />
                <p className="text-caption text-muted-fg">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <Button fullWidth size="lg">
            Full-width primary action
          </Button>
        </Section>

        <Section title="Inputs">
          <Input
            label="Display name"
            placeholder="e.g. Aline"
            hint="Shown on your page"
          />
          <Input
            label="Username"
            defaultValue="aline"
            error="This username is already taken"
          />
          <PhoneInput value={phone} onChange={setPhone} />
          <AmountInput
            value={amount}
            onChange={setAmount}
            label="Support amount"
            hint="100% goes to the creator"
          />
        </Section>

        <Section title="Tabs">
          <Tabs
            ariaLabel="Creator sections"
            value={tab}
            onChange={setTab}
            items={[
              { id: "home", label: "Home", icon: <Home className="size-4" /> },
              {
                id: "content",
                label: "Content",
                icon: <Library className="size-4" />,
              },
              {
                id: "earnings",
                label: "Earnings",
                icon: <Compass className="size-4" />,
                badge: 3,
              },
              {
                id: "settings",
                label: "Settings",
                icon: <Settings className="size-4" />,
              },
            ]}
          />
          <Tabs
            ariaLabel="Segmented"
            variant="segmented"
            value={tab}
            onChange={setTab}
            items={[
              { id: "home", label: "Posts" },
              { id: "content", label: "Shop" },
              { id: "earnings", label: "Tickets" },
            ]}
          />
        </Section>

        <Section title="Cards, money, badges">
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar name="Aline Uwase" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold">Aline Uwase</p>
                <p className="truncate text-caption text-muted-fg">@aline</p>
              </div>
              <Badge tone="success">Live</Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-label text-muted-fg">Total earned</span>
              <Money value={125000} className="text-heading font-bold" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="brand">Brand</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="danger">Danger</Badge>
              <Badge tone="info">Info</Badge>
            </div>
          </Card>
          <div className="flex items-center gap-4">
            <Avatar name="Aline Uwase" size="sm" />
            <Avatar name="Aline Uwase" size="md" />
            <Avatar name="Aline Uwase" size="lg" />
            <Avatar name="Aline Uwase" size="xl" />
          </div>
        </Section>

        <Section title="Loading and empty states">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <SkeletonText lines={3} />
            <Skeleton className="h-32 w-full" rounded="card" />
          </div>
          <EmptyState
            title="No posts yet"
            description="Your published posts will appear here."
            action={<Button size="sm">Create post</Button>}
          />
          <ErrorState onRetry={() => toast("Retrying…")} />
        </Section>

        <Section title="Payment status">
          <div className="space-y-6">
            <StatusScreen
              status="waiting"
              primaryAction={{
                label: "Try again",
                onClick: () => toast("Retry"),
              }}
              secondaryAction={{
                label: "Cancel",
                onClick: () => toast("Cancelled"),
              }}
            />
            <StatusScreen
              status="success"
              name="Aline"
              reference="AGS-7F3K92"
              primaryAction={{ label: "Done", onClick: () => toast("Done") }}
            />
            <StatusScreen
              status="failed"
              primaryAction={{ label: "Try again", onClick: () => toast("Retry") }}
            />
          </div>
        </Section>

        <Section title="Share and QR">
          <div className="flex flex-wrap gap-2">
            <ShareButton url="https://agaseke.me/aline" title="Support Aline" />
            <Button variant="ghost" onClick={() => setSheetOpen(true)}>
              Open sheet
            </Button>
          </div>
          <div className="flex justify-center">
            <QRCode value="https://agaseke.me/aline" />
          </div>
        </Section>

        <Section title="Media">
          <MediaImage
            src="/agaseke.png"
            alt="Agaseke preview"
            aspectRatio="16 / 9"
            className="rounded-card"
          />
          <MediaPlayer
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            poster="/agaseke.png"
            title="Aline's video"
            sizeLabel="2.1 MB"
          />
          <MediaPlayer
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
            kind="audio"
            title="Aline's voice note"
            sizeLabel="0.4 MB"
          />
        </Section>
      </main>

      <BottomNav
        ariaLabel="Gallery navigation"
        items={[
          { href: "/", label: "Home", icon: <Home /> },
          { href: "/explore", label: "Explore", icon: <Compass /> },
          { href: "/library", label: "Library", icon: <Library /> },
          { href: "/account", label: "Account", icon: <User /> },
        ]}
      />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Support Aline"
        description="Choose an amount and confirm on your phone."
        footer={
          <div className="flex flex-col gap-2">
            <Button fullWidth>Continue</Button>
            <Button variant="ghost" fullWidth onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <AmountInput value={amount} onChange={setAmount} />
      </Sheet>
    </div>
  );
}
