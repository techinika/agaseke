"use client";

import { useCallback, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { initiateCardPayment, initiateMomoPayment } from "@/lib/paymentsService";
import { isValidRwandaPhone, normalizeRwandaPhone } from "@/lib/format/phone";
import { t } from "@/lib/i18n";
import { useTransactionPayment } from "@/features/payments";
import type { SupportMethod } from "@/features/support";

function newKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface UseTicketPaymentOptions {
  open: boolean;
  creatorHandle: string;
  gatheringId: string;
  currency: string;
  requiresCard: boolean;
  user: User | null;
  displayName?: string | null;
  defaultPhone?: string | null;
  onSuccess?: () => void;
}

export function useTicketPayment({
  open,
  creatorHandle,
  gatheringId,
  currency,
  requiresCard,
  user,
  displayName,
  defaultPhone,
  onSuccess,
}: UseTicketPaymentOptions) {
  const [method, setMethod] = useState<SupportMethod>(requiresCard ? "card" : "momo");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(newKey());
  const payment = useTransactionPayment({
    open,
    failureMessage: t("actions.ticket.failedBody"),
    onSuccess,
  });

  const activeMethod: SupportMethod = requiresCard ? "card" : method;
  const phoneValid = isValidRwandaPhone(phone);
  const canPay =
    Boolean(user) && (activeMethod === "card" || phoneValid) && !payment.submitting;

  const pay = useCallback(async () => {
    if (!user) {
      setError(t("support.guest.signInToPay"));
      return;
    }

    if (activeMethod === "momo" && !phoneValid) {
      setError(t("support.details.invalidPhone"));
      return;
    }

    setError(null);
    const attendeeName = displayName || user.email || undefined;
    const idempotencyKey = keyRef.current;

    await payment.startPayment(async () => {
      if (activeMethod === "card") {
        const result = await initiateCardPayment({
          type: "gathering",
          creatorHandle,
          gatheringId,
          email: user.email || undefined,
          firstName: displayName || user.email || "Supporter",
          lastName: "",
          attendeeName,
          attendeeEmail: user.email || undefined,
          currency,
          idempotencyKey,
        });
        return {
          reference: result.merchant_reference || result.ref,
          redirectUrl: result.redirect_url || null,
        };
      }

      const result = await initiateMomoPayment({
        type: "gathering",
        creatorHandle,
        gatheringId,
        phone: normalizeRwandaPhone(phone) || phone,
        attendeeName,
        attendeeEmail: user.email || undefined,
        currency,
        idempotencyKey,
      });
      return { reference: result.ref };
    });
  }, [
    activeMethod,
    creatorHandle,
    currency,
    displayName,
    gatheringId,
    payment,
    phone,
    phoneValid,
    user,
  ]);

  const retry = useCallback(() => {
    keyRef.current = newKey();
    setError(null);
    payment.retry();
  }, [payment]);

  return {
    status: payment.status,
    method: activeMethod,
    phone,
    error: error || payment.error,
    reference: payment.reference,
    cardRedirectUrl: payment.cardRedirectUrl,
    submitting: payment.submitting,
    checking: payment.checking,
    checkHint: payment.checkHint,
    waitingLong: payment.waitingLong,
    canPay,
    requiresCard,
    setPhone,
    setMethod: (next: SupportMethod) => {
      if (requiresCard) return;
      setError(null);
      setMethod(next);
    },
    pay,
    retry,
    checkNow: payment.checkNow,
    openCardPage: payment.openCardPage,
  };
}
