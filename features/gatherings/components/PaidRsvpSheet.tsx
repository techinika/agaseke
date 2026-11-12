"use client";

import type { User } from "firebase/auth";
import { Calendar, CreditCard, MapPin, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { CreatorTrustRow } from "@/features/actions";
import { useTicketPayment } from "../hooks/useTicketPayment";

export interface TicketGathering {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  ticketPrice?: number;
  priceUSD?: number;
  currency?: string;
}

export interface PaidRsvpSheetProps {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  creatorPhotoURL?: string | null;
  creatorVerified?: boolean;
  creatorHandle: string;
  gathering: TicketGathering;
  user: User | null;
  displayName?: string | null;
  defaultPhone?: string | null;
  onPaid?: () => void;
}

export function ticketAmount(gathering: TicketGathering): number {
  return gathering.currency === "USD"
    ? (gathering.priceUSD ?? gathering.ticketPrice ?? 0)
    : (gathering.ticketPrice ?? 0);
}

export function PaidRsvpSheet({
  open,
  onClose,
  creatorName,
  creatorPhotoURL,
  creatorVerified,
  creatorHandle,
  gathering,
  user,
  displayName,
  defaultPhone,
  onPaid,
}: PaidRsvpSheetProps) {
  const currency = gathering.currency || "RWF";
  const requiresCard = currency === "USD";
  const amount = ticketAmount(gathering);
  const price = formatMoney(amount, currency);

  const payment = useTicketPayment({
    open,
    creatorHandle,
    gatheringId: gathering.id,
    currency,
    requiresCard,
    user,
    displayName,
    defaultPhone,
    onSuccess: onPaid,
  });

  const waitingBody =
    payment.method === "card"
      ? t("support.status.waiting.bodyCard")
      : t("support.status.waiting.body");

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
        <Button fullWidth size="lg" onClick={payment.retry}>
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
        disabled={!payment.canPay}
        onClick={() => void payment.pay()}
      >
        {payment.submitting
          ? t("actions.ticket.paying")
          : t("actions.ticket.pay", { amount: price })}
      </Button>
    );
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("actions.ticket.title", { title: gathering.title })}
      description={payment.status === "idle" ? t("support.sheetHint") : undefined}
      footer={footer}
    >
      {payment.status === "waiting" ? (
        <StatusScreen
          status="waiting"
          title={t("actions.ticket.waitingTitle")}
          description={waitingBody}
          reference={payment.reference ?? undefined}
          primaryAction={{
            label: payment.checking
              ? t("actions.ticket.checking")
              : t("actions.ticket.check"),
            onClick: () => void payment.checkNow(),
            loading: payment.checking,
          }}
        />
      ) : payment.status === "success" ? (
        <StatusScreen
          status="success"
          title={t("actions.ticket.successTitle")}
          description={t("actions.ticket.successBody", { title: gathering.title })}
          reference={payment.reference ?? undefined}
        />
      ) : payment.status === "failed" ? (
        <StatusScreen
          status="failed"
          title={t("actions.ticket.failedTitle")}
          description={payment.error || t("actions.ticket.failedBody")}
        />
      ) : (
        <div className="space-y-4">
          <CreatorTrustRow
            name={creatorName}
            photoURL={creatorPhotoURL}
            verified={creatorVerified}
            subtitle={t("actions.ticket.hostedBy", { name: creatorName })}
          />

          <div className="space-y-3 rounded-control border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-body font-semibold text-fg">{gathering.title}</p>
              <p className="shrink-0 text-body font-bold text-brand-strong">{price}</p>
            </div>
            <div className="flex items-center gap-2 text-label text-muted-fg">
              <Calendar className="size-4 shrink-0" aria-hidden="true" />
              <span>
                {t("actions.rsvp.when", {
                  date: gathering.date,
                  time: gathering.time,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-label text-muted-fg">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("actions.rsvp.where", { location: gathering.location })}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-label font-semibold text-fg">
              {t("support.method.title")}
            </p>
            {requiresCard ? (
              <p className="rounded-control bg-surface-raised p-3 text-label text-muted-fg">
                {t("actions.ticket.cardOnly")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={payment.method === "momo"}
                  onClick={() => payment.setMethod("momo")}
                  className={[
                    "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                    payment.method === "momo"
                      ? "border-brand-strong bg-surface-raised text-brand-strong"
                      : "border-line text-muted-fg",
                  ].join(" ")}
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                  {t("support.method.momo")}
                </button>
                <button
                  type="button"
                  aria-pressed={payment.method === "card"}
                  onClick={() => payment.setMethod("card")}
                  className={[
                    "flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-label font-semibold transition-colors",
                    payment.method === "card"
                      ? "border-brand-strong bg-surface-raised text-brand-strong"
                      : "border-line text-muted-fg",
                  ].join(" ")}
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                  {t("support.method.card")}
                </button>
              </div>
            )}
          </div>

          {payment.method === "momo" && !requiresCard && (
            <Input
              label={t("support.details.phone")}
              hint={t("support.details.phoneHint")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="078 000 0000"
              value={payment.phone}
              onChange={(event) => payment.setPhone(event.target.value)}
            />
          )}

          {!user && (
            <p className="rounded-control bg-warning-bg p-3 text-label text-warning">
              {t("support.guest.signInToPay")}
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
