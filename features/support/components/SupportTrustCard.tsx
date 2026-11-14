"use client";

import { BadgeCheck, Lock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { t } from "@/lib/i18n";
import type { SupportBreakdown } from "../types";

export interface SupportTrustCardProps {
  creatorName: string;
  creatorPhotoURL?: string | null;
  verified?: boolean;
  currency: string;
  breakdown: SupportBreakdown;
}

export function SupportTrustCard({
  creatorName,
  creatorPhotoURL,
  verified,
  currency,
  breakdown,
}: SupportTrustCardProps) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Avatar src={creatorPhotoURL} name={creatorName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-body font-bold text-fg">
            {creatorName}
            {verified && (
              <BadgeCheck
                className="size-4 shrink-0 text-info"
                aria-label={t("support.trust.verified")}
              />
            )}
          </p>
          <p className="flex items-center gap-1 text-caption text-muted-fg">
            <Lock className="size-3" aria-hidden="true" />
            {t("support.method.secure")}
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-3 text-label">
          <dt className="text-muted-fg">{t("support.breakdown.youPay")}</dt>
          <dd className="font-semibold text-fg">
            <Money value={breakdown.total} currency={currency} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-label">
          <dt className="text-muted-fg">{t("support.breakdown.fee")}</dt>
          <dd className="text-muted-fg">
            <Money value={breakdown.fee} currency={currency} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-label">
          <dt className="text-muted-fg">
            {t("support.breakdown.creatorGets", {
              name: creatorName.split(" ")[0] || creatorName,
            })}
          </dt>
          <dd className="font-bold text-success">
            <Money value={breakdown.creatorReceives} currency={currency} />
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-muted-fg">{t("support.breakdown.feeHint")}</p>
    </Card>
  );
}
