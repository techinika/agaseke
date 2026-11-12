"use client";

import { useState } from "react";
import { Calendar, Gift, Heart, MessageCircle, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TabItem } from "@/components/ui/Tabs";
import { CreatorPageView } from "@/features/creator-page/components/CreatorPageView";
import { usePersistedTab } from "@/features/creator-page/hooks/usePersistedTab";
import { SupportSheet } from "@/features/support";
import type {
  CreatorPageCreator,
  CreatorPagePartner,
} from "@/features/creator-page/types";
import { t } from "@/lib/i18n";

const CREATOR: CreatorPageCreator = {
  uid: "preview-creator",
  name: "Aline Uwase",
  handle: "aline",
  bio: "Sharing Rwandan stories, music and the people behind them. Thank you for keeping this work independent.",
  profilePicture: null,
  bannerURL: null,
  verified: true,
  socials: {
    instagram: "aline",
    twitter: "aline",
    tiktok: "aline",
    youtube: null,
    linkedin: null,
    web: "agaseke.me",
  },
  communityEnabled: true,
  bookingEnabled: true,
  storeEnabled: true,
  giveawayEnabled: true,
  gatheringsEnabled: true,
  messagingEnabled: true,
};

const PARTNERS: CreatorPagePartner[] = [
  {
    id: "partner-1",
    name: "Kigali Sessions",
    description: "Live music and creator meetups",
    logo: null,
    website: "https://example.com",
  },
  {
    id: "partner-2",
    name: "Umurava Studio",
    description: "Photography and storytelling",
    logo: null,
    website: null,
  },
];

const TABS: TabItem[] = [
  {
    id: "community",
    label: t("creator.community"),
    icon: <Users className="size-4" aria-hidden="true" />,
  },
  {
    id: "store",
    label: t("creator.store"),
    icon: <Store className="size-4" aria-hidden="true" />,
  },
  {
    id: "giveaways",
    label: t("creator.giveaways"),
    icon: <Gift className="size-4" aria-hidden="true" />,
  },
  {
    id: "gatherings",
    label: t("creator.events"),
    icon: <Calendar className="size-4" aria-hidden="true" />,
  },
  {
    id: "message",
    label: t("creator.message"),
    icon: <MessageCircle className="size-4" aria-hidden="true" />,
  },
];

function PreviewContent({ tab }: { tab: string }) {
  if (tab === "community") {
    return (
      <div className="space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-fg">Behind the new single</p>
              <p className="mt-1 text-label text-muted-fg">
                A short look at the people and places that shaped this song.
              </p>
            </div>
            <Badge tone="brand">Supporters</Badge>
          </div>
          <div className="mt-4 aspect-video rounded-control bg-surface-raised" />
          <Button
            variant="secondary"
            className="mt-4"
            leadingIcon={<Heart className="size-4" aria-hidden="true" />}
          >
            {t("creator.support")}
          </Button>
        </Card>
        <Card className="p-4">
          <p className="font-bold text-fg">Studio diary: week 3</p>
          <p className="mt-1 text-label text-muted-fg">
            The mix is almost done. Here is the part that changed everything.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <EmptyState
      title={TABS.find((item) => item.id === tab)?.label ?? t("nav.content")}
      description={t("empty.body")}
    />
  );
}

export function CreatorPagePreview() {
  const [tab, setTab] = usePersistedTab(
    "creator:aline:tab",
    "community",
    TABS.map((item) => item.id),
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <CreatorPageView
        creator={CREATOR}
        displayName="Aline Uwase"
        handle="aline"
        bio={CREATOR.bio ?? ""}
        photoURL={null}
        socials={{
          twitter: "https://x.com/aline",
          instagram: "https://instagram.com/aline",
          tiktok: "https://tiktok.com/@aline",
          web: "https://agaseke.me",
        }}
        partners={PARTNERS}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        onSupport={() => setSupportOpen(true)}
        onShare={() => setShareOpen(true)}
        shareOpen={shareOpen}
        onCloseShare={() => setShareOpen(false)}
        isLoggedIn={false}
        showCreateBanner
      >
        <PreviewContent tab={tab} />
      </CreatorPageView>

      {supportOpen && (
        <SupportSheet
          open
          onClose={() => setSupportOpen(false)}
          creator={{
            uid: CREATOR.uid,
            handle: "aline",
            name: "Aline Uwase",
            photoURL: null,
            verified: true,
            currency: "RWF",
            storeEnabled: CREATOR.storeEnabled,
            giveawayEnabled: CREATOR.giveawayEnabled,
            gatheringsEnabled: CREATOR.gatheringsEnabled,
            communityEnabled: CREATOR.communityEnabled,
            bookingEnabled: CREATOR.bookingEnabled,
          }}
          isLoggedIn={false}
          user={null}
        />
      )}
    </>
  );
}
