"use client";

import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import { PerksList } from "./PerksList";
import type { PerkId } from "../utils";

export interface GuestPromptProps {
  creatorName: string;
  perks: PerkId[];
}

export function GuestPrompt({ creatorName, perks }: GuestPromptProps) {
  return (
    <Card className="border-brand-strong/30 bg-brand/5 p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-strong/10 text-brand-strong">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body font-bold text-fg">
            {t("support.guest.title")}
            <Badge tone="neutral">{t("support.guest.anonymousBadge")}</Badge>
          </p>
          <p className="mt-1 text-label text-muted-fg">
            {t("support.guest.body", { name: creatorName })}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <PerksList perks={perks} />
      </div>

      <p className="mt-3 text-caption text-muted-fg">{t("support.guest.signInHint")}</p>
      <p className="mt-1 text-caption text-muted-fg">{t("support.trust.privacy")}</p>
    </Card>
  );
}
