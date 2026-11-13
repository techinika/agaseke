"use client";

import Link from "next/link";
import { BadgeCheck, Calendar, Heart, LogIn, Share2, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { MediaImage } from "@/components/ui/MediaImage";
import { getIcon } from "@/components/parts/profile/GetLink";
import { t } from "@/lib/i18n";

const SOCIAL_LABELS: Record<string, string> = {
  twitter: "X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export interface CreatorHeaderProps {
  displayName: string;
  handle: string;
  bio: string;
  photoURL?: string | null;
  bannerURL?: string | null;
  verified?: boolean;
  socials: Record<string, string | null | undefined>;
  isLoggedIn: boolean;
  communityEnabled?: boolean;
  bookingEnabled?: boolean;
  onShare: () => void;
  onSupport: () => void;
}

export function CreatorHeader({
  displayName,
  handle,
  bio,
  photoURL,
  bannerURL,
  verified = false,
  socials,
  isLoggedIn,
  communityEnabled = false,
  bookingEnabled = false,
  onShare,
  onSupport,
}: CreatorHeaderProps) {
  const firstName = displayName.split(" ")[0] || displayName;
  const socialEntries = Object.entries(socials).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <header>
      <div className="w-full lg:max-w-[1200px] lg:mx-auto">
        {bannerURL ? (
          <MediaImage
            src={bannerURL}
            alt={t("creator.bannerAlt", { name: displayName })}
            aspectRatio="16 / 7"
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : (
          <div
            className="aspect-[16/7] w-full bg-gradient-to-br from-brand-strong via-brand to-fg"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mx-auto max-w-2xl px-4">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <Avatar
            src={photoURL}
            name={displayName}
            size="lg"
            className="ring-4 ring-surface"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={onShare}
            leadingIcon={<Share2 className="size-4" aria-hidden="true" />}
            aria-label={t("creator.shareProfile")}
            className="mb-1"
          >
            {t("common.share")}
          </Button>
        </div>

        <div className="mt-3">
          <h1 className="flex flex-wrap items-center gap-2 text-heading font-bold text-fg">
            {displayName}
            {verified && (
              <Badge tone="info" className="align-middle">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {t("creator.verified")}
              </Badge>
            )}
          </h1>
          <p className="text-label font-semibold text-brand-strong">@{handle}</p>
          <p className="mt-3 max-w-xl text-body text-muted-fg">{bio}</p>
        </div>

        {socialEntries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {socialEntries.map(([key, link]) => {
              const label =
                key === "web" ? t("creator.website") : (SOCIAL_LABELS[key] ?? key);
              return (
                <a
                  key={key}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${displayName} on ${label}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-line bg-surface px-3 text-label font-semibold text-muted-fg transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  {getIcon(key)}
                  <span>{label}</span>
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            fullWidth
            onClick={onSupport}
            leadingIcon={<Heart className="size-5" aria-hidden="true" />}
            className="hidden sm:inline-flex"
          >
            {t("creator.supportName", { name: firstName })}
          </Button>
          {communityEnabled && (
            <Link
              href={`/${handle}/community`}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                fullWidth: true,
              })}
            >
              <Users className="size-5" aria-hidden="true" />
              {t("creator.community")}
            </Link>
          )}
          {bookingEnabled && (
            <Link
              href={`/${handle}/booking`}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                fullWidth: true,
              })}
            >
              <Calendar className="size-5" aria-hidden="true" />
              {t("creator.events")}
            </Link>
          )}
        </div>

        {!isLoggedIn && (
          <Link
            href={`/login?referral=${handle}&redirect=${encodeURIComponent(`/${handle}`)}`}
            className="mt-4 flex min-h-14 items-center gap-3 rounded-card border border-line bg-surface p-3 text-label text-muted-fg shadow-sm transition-colors hover:border-line-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-strong">
              <LogIn className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-fg underline decoration-brand underline-offset-2">
              {t("creator.loginPrompt")}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
