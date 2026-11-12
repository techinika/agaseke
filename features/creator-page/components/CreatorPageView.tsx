"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { buttonClasses } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import type { CreatorPageCreator, CreatorPagePartner } from "../types";
import { CreatorHeader } from "./CreatorHeader";
import { CreatorShareSheet } from "./CreatorShareSheet";
import { CreatorSupportBar } from "./CreatorSupportBar";
import { PartnerSection } from "./PartnerSection";

export interface CreatorPageViewProps {
  creator: CreatorPageCreator;
  displayName: string;
  handle: string;
  bio: string;
  photoURL?: string | null;
  socials: Record<string, string | null | undefined>;
  partners: CreatorPagePartner[];
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSupport: () => void;
  onShare: () => void;
  shareOpen: boolean;
  onCloseShare: () => void;
  isLoggedIn: boolean;
  showCreateBanner: boolean;
  children: ReactNode;
}

export function CreatorPageView({
  creator,
  displayName,
  handle,
  bio,
  photoURL,
  socials,
  partners,
  tabs,
  activeTab,
  onTabChange,
  onSupport,
  onShare,
  shareOpen,
  onCloseShare,
  isLoggedIn,
  showCreateBanner,
  children,
}: CreatorPageViewProps) {
  const firstName = displayName.split(" ")[0] || displayName;
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label;
  const createHref = isLoggedIn
    ? `/onboarding?referral=${handle}`
    : `/login?referral=${handle}&redirect=${encodeURIComponent(`/${handle}`)}`;

  return (
    <div className="creator-page-shell min-h-dvh bg-background pb-28 md:pb-8">
      <CreatorHeader
        displayName={displayName}
        handle={handle}
        bio={bio}
        photoURL={photoURL}
        bannerURL={creator.bannerURL}
        verified={creator.verified}
        socials={socials}
        isLoggedIn={isLoggedIn}
        communityEnabled={creator.communityEnabled === true}
        bookingEnabled={creator.bookingEnabled === true}
        onShare={onShare}
        onSupport={onSupport}
      />

      <div className="mx-auto mt-6 max-w-2xl px-4">
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel={t("nav.content")}
        />
      </div>

      <main
        role="tabpanel"
        aria-label={activeLabel ?? t("nav.content")}
        className="mx-auto max-w-2xl px-4 py-6"
      >
        {children}
      </main>

      <PartnerSection partners={partners} />

      {showCreateBanner && (
        <div className="mx-auto max-w-2xl px-4 pb-8">
          <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-fg">{t("creator.createTitle")}</p>
              <p className="mt-1 text-label text-muted-fg">{t("creator.createBody")}</p>
            </div>
            <Link
              href={createHref}
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              {t("creator.createCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      )}

      <CreatorSupportBar firstName={firstName} onSupport={onSupport} />

      <CreatorShareSheet
        open={shareOpen}
        onClose={onCloseShare}
        displayName={displayName}
        handle={handle}
      />
    </div>
  );
}
