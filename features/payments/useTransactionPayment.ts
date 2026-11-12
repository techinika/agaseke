"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { normalizeTransactionStatus } from "@/features/support/utils";
import { pollSupportTransaction, watchSupportTransaction } from "@/features/support/api";
import type { SupportStatus, TransactionSnapshot } from "@/features/support/types";

const WAITING_HINT_MS = 90_000;
const POLL_INTERVAL_MS = 5_000;

export interface StartPaymentResult {
  reference: string;
  redirectUrl?: string | null;
}

export interface UseTransactionPaymentOptions {
  open: boolean;
  failureMessage?: string;
  onSuccess?: (reference: string) => void;
}

export function useTransactionPayment({
  open,
  failureMessage,
  onSuccess,
}: UseTransactionPaymentOptions) {
  const [status, setStatus] = useState<SupportStatus>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [cardRedirectUrl, setCardRedirectUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkHint, setCheckHint] = useState<string | null>(null);
  const [waitingLong, setWaitingLong] = useState(false);

  const submittingRef = useRef(false);
  const settledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open || status !== "waiting") return;
    const timer = setTimeout(() => setWaitingLong(true), WAITING_HINT_MS);
    return () => clearTimeout(timer);
  }, [open, status, reference]);

  const applyTransaction = useCallback(
    (transaction: TransactionSnapshot) => {
      if (!mountedRef.current) return;
      const next = normalizeTransactionStatus(transaction.status);

      if (next === "waiting") {
        setStatus("waiting");
        return;
      }

      if (settledRef.current) return;
      settledRef.current = true;

      if (next === "success") {
        setStatus("success");
        setError(null);
        onSuccess?.(transaction.ref);
        return;
      }

      setStatus("failed");
      setError(failureMessage ?? t("error.body"));
    },
    [failureMessage, onSuccess],
  );

  useEffect(() => {
    if (!open || status !== "waiting" || !reference) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        const transaction = await pollSupportTransaction(reference);
        if (transaction) applyTransaction(transaction);
      }, POLL_INTERVAL_MS);
    };

    const unsubscribe = watchSupportTransaction(reference, applyTransaction, () =>
      startPolling(),
    );

    return () => {
      unsubscribe();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [open, status, reference, applyTransaction]);

  const startPayment = useCallback(
    async (starter: () => Promise<StartPaymentResult>) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      setCheckHint(null);
      setWaitingLong(false);
      settledRef.current = false;

      try {
        const result = await starter();
        setReference(result.reference);
        setCardRedirectUrl(result.redirectUrl ?? null);
        setStatus("waiting");
        if (result.redirectUrl) {
          window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
        }
      } catch (caught) {
        setStatus("failed");
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : (failureMessage ?? t("error.body")),
        );
      } finally {
        submittingRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [failureMessage],
  );

  const retry = useCallback(() => {
    settledRef.current = false;
    setStatus("idle");
    setError(null);
    setReference(null);
    setCardRedirectUrl(null);
    setCheckHint(null);
    setWaitingLong(false);
  }, []);

  const checkNow = useCallback(async () => {
    if (!reference || checking) return;
    setChecking(true);
    setCheckHint(null);
    try {
      const transaction = await pollSupportTransaction(reference);
      if (transaction) {
        applyTransaction(transaction);
        setCheckHint(
          normalizeTransactionStatus(transaction.status) === "waiting"
            ? t("support.status.stillWaiting")
            : null,
        );
      } else {
        setCheckHint(t("support.status.stillWaiting"));
      }
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  }, [applyTransaction, checking, reference]);

  const openCardPage = useCallback(() => {
    if (cardRedirectUrl) {
      window.open(cardRedirectUrl, "_blank", "noopener,noreferrer");
    }
  }, [cardRedirectUrl]);

  return {
    status,
    reference,
    cardRedirectUrl,
    submitting,
    error,
    checking,
    checkHint,
    waitingLong,
    startPayment,
    retry,
    checkNow,
    openCardPage,
  };
}
