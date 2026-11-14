"use client";

import { ArrowLeft, CreditCard, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { GuestPrompt } from "./GuestPrompt";
import { SupportTrustCard } from "./SupportTrustCard";
import type { PerkId } from "../utils";
import type { MobileNetwork, SupportBreakdown, SupportMethod } from "../types";

type MethodOption = {
  id: string;
  method: SupportMethod;
  network?: MobileNetwork;
  label: string;
  hint: string;
  icon: typeof Smartphone;
};

const OPTIONS: MethodOption[] = [
  {
    id: "mtn",
    method: "momo",
    network: "MTN",
    label: t("support.method.momo"),
    hint: t("support.method.momoHint"),
    icon: Smartphone,
  },
  {
    id: "airtel",
    method: "momo",
    network: "Airtel",
    label: t("support.method.airtel"),
    hint: t("support.method.airtelHint"),
    icon: Smartphone,
  },
  {
    id: "card",
    method: "card",
    label: t("support.method.card"),
    hint: t("support.method.cardHint"),
    icon: CreditCard,
  },
];

export interface PayStepProps {
  creatorName: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  currency: string;
  breakdown: SupportBreakdown;
  method: SupportMethod;
  network: MobileNetwork;
  phone: string;
  error?: string | null;
  isLoggedIn: boolean;
  userName?: string | null;
  userPhotoURL?: string | null;
  perks: PerkId[];
  onMethod: (method: SupportMethod, network?: MobileNetwork) => void;
  onPhone: (value: string) => void;
  onBack: () => void;
}

export function PayStep({
  creatorName,
  creatorPhotoURL,
  creatorVerified,
  currency,
  breakdown,
  method,
  network,
  phone,
  error,
  isLoggedIn,
  userName,
  userPhotoURL,
  perks,
  onMethod,
  onPhone,
  onBack,
}: PayStepProps) {
  const selectedId = method === "card" ? "card" : network.toLowerCase();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="md"
        onClick={onBack}
        leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
        className="-ml-2 justify-start"
      >
        {t("support.review.back")}
      </Button>

      {isLoggedIn ? (
        <div className="flex items-center gap-3 rounded-control border border-line bg-surface-raised p-3">
          <Avatar src={userPhotoURL} name={userName} size="sm" />
          <p className="min-w-0 text-label text-muted-fg">
            {t("support.trust.signedInAs", { name: userName || "you" })}
          </p>
          <Badge tone="success" className="ml-auto shrink-0">
            {t("support.trust.signedInBadge")}
          </Badge>
        </div>
      ) : (
        <GuestPrompt creatorName={creatorName} perks={perks} />
      )}

      <div>
        <p className="mb-2 text-label font-semibold text-fg">
          {t("support.method.title")}
        </p>
        <div className="grid gap-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.id === selectedId;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onMethod(option.method, option.network)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  active
                    ? "border-brand-strong bg-brand/5"
                    : "border-line-strong bg-surface hover:bg-surface-raised",
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
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-fg">
                    {option.label}
                  </span>
                  <span className="block text-caption text-muted-fg">{option.hint}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 rounded-full border-2",
                    active
                      ? "border-brand-strong bg-brand-strong"
                      : "border-line-strong bg-surface",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {method === "momo" && (
        <div className="space-y-2">
          <PhoneInput value={phone} onChange={onPhone} />
          <div className="rounded-control bg-info-bg p-3 text-label text-info">
            {t("support.method.momoInstruction")}
          </div>
        </div>
      )}

      {method === "card" && (
        <div className="rounded-control bg-info-bg p-3 text-label text-info">
          {t("support.method.cardInstruction")}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-control bg-danger-bg p-3 text-label font-medium text-danger"
        >
          {error}
        </p>
      )}

      <SupportTrustCard
        creatorName={creatorName}
        creatorPhotoURL={creatorPhotoURL}
        verified={creatorVerified}
        currency={currency}
        breakdown={breakdown}
      />

      <p className="text-caption text-muted-fg">{t("support.trust.privacy")}</p>
    </div>
  );
}
