"use client";

import { Check } from "lucide-react";
import { t } from "@/lib/i18n";
import type { PerkId } from "../utils";

const PERK_LABELS: Record<PerkId, string> = {
  store: t("support.trust.perkStore"),
  giveaways: t("support.trust.perkGiveaways"),
  gatherings: t("support.trust.perkGatherings"),
  community: t("support.trust.perkCommunity"),
  booking: t("support.trust.perkBooking"),
};

export function PerksList({ perks }: { perks: PerkId[] }) {
  if (perks.length === 0) return null;

  return (
    <div className="rounded-control bg-surface-raised p-3">
      <p className="text-label font-semibold text-fg">{t("support.trust.perksTitle")}</p>
      <ul className="mt-2 grid gap-1.5">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-label text-muted-fg">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>{PERK_LABELS[perk]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
