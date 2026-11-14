"use client";

import { useState } from "react";
import { Gift, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import {
  CreatorTrustRow,
  SupporterActionSheet,
  formatActionDate,
  type ActionSheetStatus,
  type DateLike,
} from "@/features/actions";

export interface GiveawayEntrySheetProps {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  title: string;
  closesAt: DateLike;
  maxWinners: number;
  rewardCount: number;
  onConfirm: () => Promise<void>;
  onEntered?: () => void;
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error && error.message ? error.message : null;
}

export function GiveawayEntrySheet({
  open,
  onClose,
  creatorName,
  creatorPhotoURL,
  creatorVerified,
  title,
  closesAt,
  maxWinners,
  rewardCount,
  onConfirm,
  onEntered,
}: GiveawayEntrySheetProps) {
  const [status, setStatus] = useState<ActionSheetStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const closesLabel = formatActionDate(closesAt);

  const submit = async () => {
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      await onConfirm();
      setStatus("success");
      onEntered?.();
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus("failed");
    }
  };

  return (
    <SupporterActionSheet
      open={open}
      onClose={onClose}
      title={t("actions.giveaway.title")}
      description={t("actions.giveaway.hint")}
      status={status}
      successTitle={t("actions.giveaway.successTitle")}
      successBody={t("actions.giveaway.successBody", {
        title,
        date: closesLabel || t("actions.giveaway.closingDate"),
      })}
      failedTitle={t("actions.giveaway.failedTitle")}
      failedBody={t("actions.giveaway.failedBody")}
      error={error}
      onRetry={() => void submit()}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={status === "submitting"}
          onClick={() => void submit()}
        >
          {status === "submitting"
            ? t("actions.giveaway.ctaLoading")
            : t("actions.giveaway.cta")}
        </Button>
      }
    >
      <CreatorTrustRow
        name={creatorName}
        photoURL={creatorPhotoURL}
        verified={creatorVerified}
        subtitle={t("actions.giveaway.closes", {
          date: closesLabel || t("actions.giveaway.soon"),
        })}
      />

      <div className="rounded-control border border-line bg-surface p-4">
        <p className="text-body font-semibold text-fg">{title}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-control bg-surface-raised p-3">
            <Trophy className="size-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-caption text-muted-fg">
                {t("actions.giveaway.winners", { count: maxWinners })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-control bg-surface-raised p-3">
            <Gift className="size-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-caption text-muted-fg">
                {rewardCount === 1
                  ? t("actions.giveaway.prize")
                  : t("actions.giveaway.prizes", { count: rewardCount })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-control bg-info-bg p-3 text-label text-info">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{t("actions.giveaway.rules")}</p>
      </div>
    </SupporterActionSheet>
  );
}
