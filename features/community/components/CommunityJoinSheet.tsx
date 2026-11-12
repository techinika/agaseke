"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { Check, CreditCard, Crown, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { isValidRwandaPhone, normalizeRwandaPhone } from "@/lib/format/phone";
import { initiateSubscription } from "@/lib/communityService";
import { CreatorTrustRow } from "@/features/actions";
import { useTransactionPayment } from "@/features/payments";
import type { CommunityTierView } from "../types";

export interface CommunityJoinSheetProps {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  creatorHandle: string;
  creatorUid: string;
  tiers: CommunityTierView[];
  initialTierId?: string | null;
  user: User | null;
  displayName?: string | null;
  defaultPhone?: string | null;
  onJoined?: () => void;
}

export function tierAmount(tier: CommunityTierView): number {
  return tier.currency === "USD" ? (tier.priceUSD ?? tier.price) : tier.price;
}

export function tierIntervalLabel(tier: CommunityTierView): string {
  return tier.interval === "yearly"
    ? t("actions.community.perYear")
    : t("actions.community.perMonth");
}

export function CommunityJoinSheet({
  open,
  onClose,
  creatorName,
  creatorPhotoURL,
  creatorVerified,
  creatorHandle,
  creatorUid,
  tiers,
  initialTierId,
  user,
  displayName,
  defaultPhone,
  onJoined,
}: CommunityJoinSheetProps) {
  const [selectedId, setSelectedId] = useState(initialTierId || tiers[0]?.id || "");
  const selectedTier = tiers.find((tier) => tier.id === selectedId) || tiers[0] || null;
  const requiresCard = selectedTier?.currency === "USD";
  const [method, setMethod] = useState<"momo" | "card">(requiresCard ? "card" : "momo");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState<string | null>(null);

  const payment = useTransactionPayment({
    open,
    failureMessage: t("actions.community.failedBody"),
    onSuccess: () => onJoined?.(),
  });

  const activeMethod = requiresCard ? "card" : method;
  const phoneValid = isValidRwandaPhone(phone);
  const canJoin =
    Boolean(user) && Boolean(selectedTier) && (activeMethod === "card" || phoneValid);

  const chooseTier = (tier: CommunityTierView) => {
    setSelectedId(tier.id);
    setError(null);
    if (tier.currency === "USD") setMethod("card");
  };

  const join = async () => {
    if (!selectedTier || !user) {
      setError(t("actions.community.signedOut"));
      return;
    }
    if (activeMethod === "momo" && !phoneValid) {
      setError(t("actions.community.invalidPhone"));
      return;
    }

    setError(null);
    const payload = {
      tierId: selectedTier.id,
      tierName: selectedTier.name,
      creatorId: creatorUid,
      creatorHandle,
      amount: tierAmount(selectedTier),
      interval: selectedTier.interval,
      paymentMethod: activeMethod,
      currency: selectedTier.currency || "RWF",
      supporterId: user.uid,
      ...(activeMethod === "momo"
        ? { phone: normalizeRwandaPhone(phone) || phone }
        : {
            email: user.email || "",
            firstName: displayName || user.displayName || "Supporter",
            lastName: "",
          }),
    };

    await payment.startPayment(async () => {
      const result = await initiateSubscription(payload);
      return {
        reference: result.paymentRef,
        redirectUrl: result.paymentUrl || null,
      };
    });
  };

  const retry = () => {
    setError(null);
    payment.retry();
  };

  const footer = (() => {
    if (payment.status === "success") {
      return (
        <Button fullWidth size="lg" onClick={onClose}>
          {t("common.done")}
        </Button>
      );
    }
    if (payment.status === "failed") {
      return (
        <Button fullWidth size="lg" onClick={retry}>
          {t("common.retry")}
        </Button>
      );
    }
    if (payment.status === "waiting") {
      return (
        <div className="space-y-2">
          <Button
            fullWidth
            size="lg"
            loading={payment.checking}
            onClick={() => void payment.checkNow()}
          >
            {payment.checking ? t("actions.ticket.checking") : t("actions.ticket.check")}
          </Button>
          {payment.cardRedirectUrl && (
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onClick={payment.openCardPage}
            >
              {t("actions.ticket.cardOpen")}
            </Button>
          )}
        </div>
      );
    }
    return (
      <Button
        fullWidth
        size="lg"
        loading={payment.submitting}
        disabled={!canJoin}
        onClick={() => void join()}
      >
        {payment.submitting
          ? t("actions.community.joining")
          : selectedTier
            ? t("actions.community.join", {
                amount: formatMoney(
                  tierAmount(selectedTier),
                  selectedTier.currency || "RWF",
                ),
              })
            : t("actions.community.joinFallback")}
      </Button>
    );
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("actions.community.title")}
      description={payment.status === "idle" ? t("actions.community.hint") : undefined}
      footer={footer}
    >
      {payment.status === "waiting" ? (
        <StatusScreen
          status="waiting"
          title={t("actions.community.waitingTitle")}
          description={
            activeMethod === "card"
              ? t("support.status.waiting.bodyCard")
              : t("support.status.waiting.body")
          }
          reference={payment.reference ?? undefined}
        />
      ) : payment.status === "success" ? (
        <StatusScreen
          status="success"
          title={t("actions.community.successTitle")}
          description={t("actions.community.successBody", {
            name: creatorName,
          })}
          reference={payment.reference ?? undefined}
        />
      ) : payment.status === "failed" ? (
        <StatusScreen
          status="failed"
          title={t("actions.community.failedTitle")}
          description={payment.error || t("actions.community.failedBody")}
        />
      ) : (
        <div className="space-y-4">
          <CreatorTrustRow
            name={creatorName}
            photoURL={creatorPhotoURL}
            verified={creatorVerified}
            subtitle={t("actions.community.hostedBy", { name: creatorName })}
          />

          {tiers.length === 0 ? (
            <p className="rounded-control bg-surface-raised p-4 text-label text-muted-fg">
              {t("actions.community.noTiers")}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-label font-semibold text-fg">
                {t("actions.community.chooseTier")}
              </p>
              {tiers.map((tier) => {
                const selected = tier.id === selectedTier?.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseTier(tier)}
                    className={[
                      "w-full rounded-control border-2 p-4 text-left transition-colors",
                      selected
                        ? "border-brand-strong bg-surface-raised"
                        : "border-line bg-surface",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Crown
                            className="size-4 text-brand-strong"
                            aria-hidden="true"
                          />
                          <p className="text-body font-semibold text-fg">{tier.name}</p>
                        </div>
                        {tier.description && (
                          <p className="mt-1 text-label text-muted-fg">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-body font-bold text-brand-strong">
                          {formatMoney(tierAmount(tier), tier.currency || "RWF")}
                        </p>
                        <p className="text-caption text-muted-fg">
                          {tierIntervalLabel(tier)}
                        </p>
                      </div>
                    </div>
                    {tier.benefits.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {tier.benefits.map((benefit) => (
                          <li
                            key={benefit}
                            className="flex items-start gap-2 text-caption text-muted-fg"
                          >
                            <Check
                              className="mt-0.5 size-3.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedTier && (
            <div className="space-y-3">
              <p className="text-label font-semibold text-fg">
                {t("support.method.title")}
              </p>
              {requiresCard ? (
                <p className="rounded-control bg-surface-raised p-3 text-label text-muted-fg">
                  {t("actions.community.cardOnly")}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={method === "momo"}
                    onClick={() => setMethod("momo")}
                    className={[
                      "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                      method === "momo"
                        ? "border-brand-strong bg-surface-raised text-brand-strong"
                        : "border-line text-muted-fg",
                    ].join(" ")}
                  >
                    <Smartphone className="size-4" aria-hidden="true" />
                    {t("support.method.momo")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={method === "card"}
                    onClick={() => setMethod("card")}
                    className={[
                      "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                      method === "card"
                        ? "border-brand-strong bg-surface-raised text-brand-strong"
                        : "border-line text-muted-fg",
                    ].join(" ")}
                  >
                    <CreditCard className="size-4" aria-hidden="true" />
                    {t("support.method.card")}
                  </button>
                </div>
              )}

              {activeMethod === "momo" && (
                <Input
                  label={t("support.details.phone")}
                  hint={t("support.details.phoneHint")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="078 000 0000"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                />
              )}
            </div>
          )}

          {!user && (
            <p className="rounded-control bg-warning-bg p-3 text-label text-warning">
              {t("actions.community.signedOut")}
            </p>
          )}

          {error && (
            <p role="alert" className="text-caption font-medium text-danger">
              {error}
            </p>
          )}
          {payment.checkHint && (
            <p className="text-label text-muted-fg">{payment.checkHint}</p>
          )}

          <p className="text-caption text-muted-fg">{t("actions.trustNote")}</p>
        </div>
      )}
    </Sheet>
  );
}
