"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { toast } from "@/components/ui/Toast";
import { isValidRwandaPhone, normalizeRwandaPhone } from "@/lib/format/phone";
import { t } from "@/lib/i18n";
import {
  fetchSupportConfig,
  pollSupportTransaction,
  startCardSupport,
  startMomoSupport,
  watchSupportTransaction,
} from "../api";
import { GUEST_CHECKOUT_ENABLED } from "../constants";
import { completeSupporterRedirect, signInSupporter } from "../signIn";
import type {
  MobileNetwork,
  PendingSupport,
  SupportConfig,
  SupportCreator,
  SupportDraft,
  SupportMethod,
  SupportStatus,
  SupportStep,
  TransactionSnapshot,
} from "../types";
import {
  buildSupportConfig,
  calculateSupportBreakdown,
  clearPendingSupport,
  clearSupportDraft,
  isValidSupportAmount,
  networkForPhone,
  normalizeTransactionStatus,
  perksForCreator,
  readLastChoice,
  readPendingSupport,
  readSupportDraft,
  saveLastChoice,
  savePendingSupport,
  saveSupportDraft,
} from "../utils";

const WAITING_HINT_MS = 90_000;
const POLL_INTERVAL_MS = 5_000;

export interface UseSupportFlowOptions {
  open: boolean;
  creator: SupportCreator;
  isLoggedIn: boolean;
  user: User | null;
  resumeReference?: string | null;
  onSuccess?: () => void;
  onClose: () => void;
}

function newKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `support_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/auth|sign in|unauthor/i.test(message)) {
    return t("support.error.signIn");
  }
  if (/network|fetch|timeout|abort/i.test(message)) {
    return t("support.error.network");
  }
  return message || t("support.error.generic");
}

interface InitialFlowState {
  amount: number | "";
  message: string;
  method: SupportMethod;
  network: MobileNetwork;
  phone: string;
  step: SupportStep;
  status: SupportStatus;
  reference: string | null;
  cardRedirectUrl: string | null;
  waitingLong: boolean;
}

function computeInitialState(
  handle: string,
  resumeReference?: string | null,
): InitialFlowState {
  const pending = readPendingSupport(handle);
  const matchesResume = !resumeReference || pending?.reference === resumeReference;

  if (pending && matchesResume) {
    return {
      amount: pending.amount,
      message: "",
      method: pending.method,
      network: "MTN",
      phone: "",
      step: "status",
      status: "waiting",
      reference: pending.reference,
      cardRedirectUrl: pending.redirectUrl ?? null,
      waitingLong: Date.now() - pending.createdAt > WAITING_HINT_MS,
    };
  }

  const draft = readSupportDraft(handle);
  if (draft) {
    return {
      amount: draft.amount,
      message: draft.message,
      method: draft.method,
      network: draft.network,
      phone: draft.phone,
      step: "pay",
      status: "idle",
      reference: null,
      cardRedirectUrl: null,
      waitingLong: false,
    };
  }

  const last = readLastChoice();
  return {
    amount: last?.amount ?? "",
    message: "",
    method: last?.method ?? "momo",
    network: "MTN",
    phone: "",
    step: "amount",
    status: "idle",
    reference: null,
    cardRedirectUrl: null,
    waitingLong: false,
  };
}

export function useSupportFlow({
  open,
  creator,
  isLoggedIn,
  user,
  resumeReference,
  onSuccess,
  onClose,
}: UseSupportFlowOptions) {
  const [initial] = useState(() => computeInitialState(creator.handle, resumeReference));
  const [config, setConfig] = useState<SupportConfig>(() => buildSupportConfig(creator));
  const [step, setStep] = useState<SupportStep>(initial.step);
  const [status, setStatus] = useState<SupportStatus>(initial.status);
  const [amount, setAmount] = useState<number | "">(initial.amount);
  const [message, setMessage] = useState(initial.message);
  const [method, setMethod] = useState<SupportMethod>(initial.method);
  const [network, setNetwork] = useState<MobileNetwork>(initial.network);
  const [phone, setPhone] = useState(initial.phone);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(initial.reference);
  const [cardRedirectUrl, setCardRedirectUrl] = useState<string | null>(
    initial.cardRedirectUrl,
  );
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkHint, setCheckHint] = useState<string | null>(null);
  const [waitingLong, setWaitingLong] = useState(initial.waitingLong);

  const submittingRef = useRef(false);
  const settledRef = useRef(false);
  const keyRef = useRef(newKey());
  const mountedRef = useRef(true);

  const minAmount = config.minAmount;
  const breakdown = calculateSupportBreakdown(
    typeof amount === "number" ? amount : 0,
    config.creatorShare,
  );
  const amountValid =
    isValidSupportAmount(amount, minAmount, breakdown.total) &&
    (typeof amount !== "number" || amount >= minAmount);
  const phoneValid = isValidRwandaPhone(phone);
  const canPay =
    amountValid &&
    (method === "card" || (phoneValid && !networkMismatch(phone, network))) &&
    !submitting;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void fetchSupportConfig(creator.handle).then((next) => {
      if (!cancelled) setConfig(next);
    });

    return () => {
      cancelled = true;
    };
  }, [open, creator.handle]);

  useEffect(() => {
    if (!open || isLoggedIn) return;
    if (!readSupportDraft(creator.handle)) return;
    void completeSupporterRedirect();
  }, [open, isLoggedIn, creator.handle]);

  useEffect(() => {
    if (!open) return;
    const last = readLastChoice();
    saveLastChoice({
      amount: typeof amount === "number" ? amount : last?.amount,
      method,
    });
  }, [amount, method, open]);

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

      if (next === "success") {
        if (settledRef.current) return;
        settledRef.current = true;
        setStatus("success");
        setStep("status");
        setError(null);
        clearPendingSupport();
        clearSupportDraft();
        onSuccess?.();
        return;
      }

      if (settledRef.current) return;
      settledRef.current = true;
      setStatus("failed");
      setStep("status");
      setError(t("support.status.failedBody"));
    },
    [onSuccess],
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

  const goToPay = useCallback(() => {
    setError(null);
    if (!amountValid) {
      setError(t("support.amount.invalid", { min: minAmount }));
      return;
    }
    setStep("pay");
  }, [amountValid, minAmount]);

  const backToAmount = useCallback(() => {
    setError(null);
    setStep("amount");
  }, []);

  const chooseAmount = useCallback((value: number | "") => {
    setAmount(value);
    setError(null);
  }, []);

  const chooseMethod = useCallback((next: SupportMethod, nextNetwork?: MobileNetwork) => {
    setMethod(next);
    if (nextNetwork) setNetwork(nextNetwork);
    setError(null);
  }, []);

  const updatePhone = useCallback((value: string) => {
    setPhone(value);
    const detected = networkForPhone(value);
    if (detected) setNetwork(detected);
  }, []);

  const pay = useCallback(async () => {
    if (submittingRef.current) return;

    if (!isLoggedIn) {
      setError(t("support.guest.signInToPay"));
      return;
    }

    if (!amountValid) {
      setError(t("support.amount.invalid", { min: minAmount }));
      return;
    }

    if (method === "momo" && !phoneValid) {
      setError(t("support.details.invalidPhone"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setCheckHint(null);
    setWaitingLong(false);
    settledRef.current = false;

    const request = {
      creatorHandle: creator.handle,
      amount: breakdown.total,
      currency: config.currency,
      phone,
      message,
      idempotencyKey: keyRef.current,
      user,
    };

    try {
      if (method === "card") {
        const result = await startCardSupport(request);
        const pending: PendingSupport = {
          handle: creator.handle,
          reference: result.ref,
          amount: breakdown.total,
          currency: config.currency,
          method: "card",
          createdAt: Date.now(),
          redirectUrl: result.redirectUrl,
        };
        savePendingSupport(pending);
        setReference(result.ref);
        setCardRedirectUrl(result.redirectUrl);
        setStatus("waiting");
        setStep("status");
        window.location.assign(result.redirectUrl);
        return;
      }

      const result = await startMomoSupport(request);
      savePendingSupport({
        handle: creator.handle,
        reference: result.ref,
        amount: breakdown.total,
        currency: config.currency,
        method: "momo",
        createdAt: Date.now(),
      });
      setReference(result.ref);
      setStatus("waiting");
      setStep("status");
    } catch (caught) {
      setStatus("failed");
      setStep("status");
      setError(friendlyError(caught));
      keyRef.current = newKey();
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [
    amountValid,
    breakdown.total,
    config.currency,
    creator.handle,
    isLoggedIn,
    message,
    method,
    minAmount,
    phone,
    phoneValid,
    user,
  ]);

  const retry = useCallback(() => {
    settledRef.current = false;
    keyRef.current = newKey();
    setStatus("idle");
    setError(null);
    setReference(null);
    setCardRedirectUrl(null);
    setWaitingLong(false);
    clearPendingSupport();
    setStep("pay");
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

  const signIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    setError(null);

    const draft: SupportDraft = {
      amount,
      message,
      method,
      network,
      phone,
    };
    saveSupportDraft(creator.handle, draft);

    try {
      const outcome = await signInSupporter(creator.handle);
      if (outcome === "signed-in") {
        toast.success(t("support.guest.signedIn"));
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      if (mountedRef.current) setSigningIn(false);
    }
  }, [amount, creator.handle, message, method, network, phone, signingIn]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    config,
    step,
    status,
    amount,
    message,
    method,
    network,
    phone,
    error,
    reference,
    cardRedirectUrl,
    submitting,
    signingIn,
    checking,
    checkHint,
    waitingLong,
    minAmount,
    breakdown,
    amountValid,
    phoneValid,
    canPay,
    presets: config.currency === "USD" ? [1, 5, 10, 20] : undefined,
    perks: perksForCreator(creator),
    guestCheckoutEnabled: GUEST_CHECKOUT_ENABLED,
    setMessage,
    chooseAmount,
    chooseMethod,
    setPhone: updatePhone,
    setNetwork,
    goToPay,
    backToAmount,
    pay,
    retry,
    checkNow,
    signIn,
    close,
  };
}

export function networkMismatch(phone: string, network: MobileNetwork): boolean {
  const detected = networkForPhone(phone);
  return Boolean(detected && detected !== network);
}

export function normalizePhoneForSubmit(phone: string): string {
  return normalizeRwandaPhone(phone) || phone;
}
