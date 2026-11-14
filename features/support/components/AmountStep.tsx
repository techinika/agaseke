"use client";

import { useId } from "react";
import { AmountInput } from "@/components/ui/AmountInput";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { SupportTrustCard } from "./SupportTrustCard";
import { PerksList } from "./PerksList";
import type { PerkId } from "../utils";
import type { SupportBreakdown } from "../types";

export interface AmountStepProps {
  creatorName: string;
  creatorPhotoURL?: string | null;
  verified?: boolean;
  currency: string;
  minAmount: number;
  presets?: number[];
  amount: number | "";
  message: string;
  error?: string | null;
  breakdown: SupportBreakdown;
  perks: PerkId[];
  onChangeAmount: (value: number | "") => void;
  onChangeMessage: (value: string) => void;
}

export function AmountStep({
  creatorName,
  creatorPhotoURL,
  verified,
  currency,
  minAmount,
  presets,
  amount,
  message,
  error,
  breakdown,
  perks,
  onChangeAmount,
  onChangeMessage,
}: AmountStepProps) {
  const messageId = useId();

  return (
    <div className="space-y-4">
      <AmountInput
        value={amount}
        onChange={onChangeAmount}
        presets={presets}
        currency={currency}
        min={minAmount}
        label={t("support.amount.title")}
        hint={t("support.amount.hint")}
        error={error ?? undefined}
      />

      <div>
        <label htmlFor={messageId} className="text-label font-semibold text-fg">
          {t("support.details.messageLabel")}
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(event) => onChangeMessage(event.target.value.slice(0, 280))}
          rows={2}
          placeholder={t("support.details.messagePlaceholder")}
          className={cn(
            "mt-1.5 min-h-20 w-full resize-none rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
        />
        <p className="mt-1 text-right text-caption text-muted-fg">{message.length}/280</p>
      </div>

      {breakdown.total > 0 && (
        <SupportTrustCard
          creatorName={creatorName}
          creatorPhotoURL={creatorPhotoURL}
          verified={verified}
          currency={currency}
          breakdown={breakdown}
        />
      )}

      <PerksList perks={perks} />
    </div>
  );
}
