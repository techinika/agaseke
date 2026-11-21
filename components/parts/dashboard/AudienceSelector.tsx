"use client";

import Link from "next/link";
import { Check, Crown, Globe, Heart, Layers } from "lucide-react";
import {
  type PostVisibility,
} from "@/lib/contentAccess";
import type { CommunityTier } from "@/types/community";
import { formatMoney } from "@/lib/format/money";
import { getPrice } from "@/lib/priceMap";
import { cn } from "@/lib/cn";

interface AudienceSelectorProps {
  visibility: PostVisibility;
  requiredTierIds: string[];
  tiers?: CommunityTier[];
  onChange: (next: {
    visibility: PostVisibility;
    requiredTierIds: string[];
    requiredTierNames: string[];
  }) => void;
}

const AUDIENCE_OPTIONS: {
  id: PostVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}[] = [
  {
    id: "public",
    label: "Public",
    description: "Anyone on the internet can view this.",
    icon: Globe,
  },
  {
    id: "supporters",
    label: "Supporters only",
    description: "Unlocked for anyone who supports you or joins a tier.",
    icon: Heart,
  },
  {
    id: "members",
    label: "Community members",
    description: "Unlocked for any active paid community member.",
    icon: Crown,
  },
  {
    id: "tier",
    label: "Specific membership tiers",
    description: "Only members of the tier(s) you choose below.",
    icon: Layers,
  },
];

export function AudienceSelector({
  visibility,
  requiredTierIds,
  tiers = [],
  onChange,
}: AudienceSelectorProps) {
  const activeTiers = tiers.filter((t) => t.isActive !== false);

  const selectVisibility = (nextVisibility: PostVisibility) => {
    if (nextVisibility !== "tier") {
      onChange({
        visibility: nextVisibility,
        requiredTierIds: [],
        requiredTierNames: [],
      });
      return;
    }

    const validSelected = activeTiers.filter((t) =>
      requiredTierIds.includes(t.id),
    );
    const initial =
      validSelected.length > 0
        ? validSelected
        : activeTiers.length > 0
          ? [activeTiers[0]]
          : [];
    onChange({
      visibility: "tier",
      requiredTierIds: initial.map((t) => t.id),
      requiredTierNames: initial.map((t) => t.name),
    });
  };

  const toggleTier = (tier: CommunityTier) => {
    const exists = requiredTierIds.includes(tier.id);
    const nextIds = exists
      ? requiredTierIds.filter((id) => id !== tier.id)
      : [...requiredTierIds, tier.id];
    const nextNames = activeTiers
      .filter((t) => nextIds.includes(t.id))
      .map((t) => t.name);

    onChange({
      visibility: "tier",
      requiredTierIds: nextIds,
      requiredTierNames: nextNames,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5">
        {AUDIENCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = visibility === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectVisibility(option.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-control border px-3.5 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active
                  ? "border-brand-strong bg-brand/5"
                  : "border-line bg-surface hover:bg-surface-raised",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  active
                    ? "bg-brand-strong text-on-brand"
                    : "bg-surface-raised text-muted-fg",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label font-semibold text-fg">
                  {option.label}
                </span>
                <span className="block text-caption text-muted-fg">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {visibility === "tier" && (
        <div className="rounded-control border border-line bg-surface-raised p-3.5 space-y-2.5">
          <p className="text-caption font-semibold text-fg">
            Choose which membership tiers unlock this content
          </p>
          {activeTiers.length === 0 ? (
            <div className="rounded-control border border-dashed border-line bg-surface p-3 text-caption text-muted-fg">
              You don&apos;t have any active membership tiers yet.{" "}
              <Link
                href="/creator/community"
                className="font-semibold text-brand-strong hover:underline"
              >
                Create membership tiers
              </Link>{" "}
              first, or choose &ldquo;Supporters only&rdquo;.
            </div>
          ) : (
            <div className="grid gap-2">
              {activeTiers.map((tier) => {
                const selected = requiredTierIds.includes(tier.id);
                const price = getPrice(tier);
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTier(tier)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-brand-strong bg-surface"
                        : "border-line bg-surface/60 hover:bg-surface",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-brand-strong bg-brand-strong text-on-brand"
                            : "border-line-strong bg-surface",
                        )}
                      >
                        {selected && <Check className="size-3.5" aria-hidden="true" />}
                      </span>
                      <span className="truncate text-label font-semibold text-fg">
                        {tier.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-caption font-medium tabular-nums text-muted-fg">
                      {formatMoney(price, tier.currency || "RWF")}/
                      {tier.interval === "yearly" ? "yr" : "mo"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
