/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  fetchPayoutOverview,
  requestWithdrawalQuote,
  submitWithdrawRequest,
  subscribeToCreatorPayouts,
  subscribeToCreatorWithdrawRequests,
  subscribeToLatestVerificationRequest,
  type CurrencyBalance,
  type WithdrawalQuote,
} from "@/lib/payoutsService";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { EmptyState } from "./payoutspage/index";
import { getCurrencySymbol } from "@/types/currency";
import { getCurrencyDefinition, type CurrencyCode } from "@/lib/money";
import { maskPayoutNumber } from "@/lib/format/payout";
import { fromMajor, toMajor, resolveHistoricalCurrency } from "@/lib/money";
import { parsePayoutCurrency } from "@/lib/payouts/currency";
import { resolveTargetPayoutAccount } from "@/lib/payouts/targetAccount";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";

export default function PayoutsPage() {
  const router = useRouter();
  const { creator } = useAuth();
  const [view, setView] = useState("overview");
  const [historyTab, setHistoryTab] = useState("payouts");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorCurrency, setCreatorCurrency] = useState("RWF");
  const [withdrawThreshold, setWithdrawThreshold] = useState<number | null>(null);

  const [withdrawType, setWithdrawType] = useState<"all" | "custom">("all");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [withdrawRequestKey, setWithdrawRequestKey] = useState<string | null>(null);
  const [withdrawQuote, setWithdrawQuote] = useState<WithdrawalQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [perCurrencyBalances, setPerCurrencyBalances] = useState<CurrencyBalance[]>([]);

  const activeBalance = perCurrencyBalances.find(
    (balance) => balance.currency === creatorCurrency,
  );
  const pendingAmount = activeBalance?.pending ?? 0;
  const convertibleTotal = activeBalance?.convertiblePending ?? pendingAmount;
  const hasOtherCurrencyBalances = perCurrencyBalances.some(
    (b) => b.currency !== creatorCurrency && b.pending > 0,
  );
  const canWithdraw =
    withdrawThreshold !== null &&
    (pendingAmount >= withdrawThreshold || convertibleTotal >= withdrawThreshold);
  const isVerified = creator?.verified || false;
  const targetAccount = resolveTargetPayoutAccount(
    creator as Record<string, unknown> | null,
    verificationRequest,
  );
  const prefShort = targetAccount.payoutPreference === "bank" ? "BANK" : "MOMO";

  useEffect(() => {
    if (!creator?.uid) return;

    void fetchPayoutOverview(creator as any)
      .then((overview) => {
        if (!overview) return;
        setCreatorCurrency(overview.creatorCurrency);
        setWithdrawThreshold(overview.withdrawThreshold);
        setPerCurrencyBalances(overview.perCurrencyBalances);
      })
      .catch(() => {});

    const unsubPayouts = subscribeToCreatorPayouts(creator.uid, (items) => {
      setPayouts(items as any[]);
      setLoading(false);
    });
    const unsubRequests = subscribeToCreatorWithdrawRequests(creator.uid, (items) => {
      setRequests(items as any[]);
    });
    const unsubVerification = subscribeToLatestVerificationRequest(
      creator.uid,
      (item) => {
        if (item) setVerificationRequest(item as any);
      },
    );

    return () => {
      unsubPayouts();
      unsubRequests();
      unsubVerification();
    };
  }, [creator]);

  const selectPayoutCurrency = (balance: CurrencyBalance) => {
    setCreatorCurrency(balance.currency);
    setWithdrawThreshold(balance.threshold);
    setWithdrawRequestKey(null);
    setWithdrawQuote(null);
    setCustomAmount("");
    setWithdrawType("all");
  };

  const handleWithdrawInit = () => {
    if (!isVerified) {
      toast.error("Please verify your identity first.");
      router.push("/creator/settings?tab=verification");
      return;
    }
    if (withdrawThreshold === null) {
      toast.error(`Withdrawals are not configured for ${creatorCurrency}`);
      return;
    }
    if (pendingAmount < withdrawThreshold && convertibleTotal < withdrawThreshold) {
      toast.error(
        `Minimum withdraw is ${withdrawThreshold.toLocaleString()} ${getCurrencySymbol(creatorCurrency)}`,
      );
      return;
    }
    setWithdrawQuote(null);
    setWithdrawRequestKey((current) => current ?? crypto.randomUUID());
    setView("withdraw");
  };

  const resolveRequestedAmount = (): string => {
    if (withdrawType === "all") {
      if (withdrawQuote) return String(withdrawQuote.requestedPayoutAmountMajor);
      return String(pendingAmount);
    }
    return customAmount.trim();
  };

  const handleGetQuote = async () => {
    const rawAmount =
      withdrawType === "all"
        ? String(pendingAmount || withdrawThreshold || 0)
        : customAmount.trim();
    if (!rawAmount) {
      toast.error("Enter an amount to convert");
      return;
    }
    setQuoteLoading(true);
    try {
      const quote = await requestWithdrawalQuote({
        amount: rawAmount,
        payoutCurrency: creatorCurrency,
      });
      setWithdrawQuote(quote);
      toast.success("Conversion quote locked for 10 minutes");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to get conversion quote");
      setWithdrawQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!creator) return;
    const rawAmount = resolveRequestedAmount();
    let finalAmount: number;

    try {
      const parsed = fromMajor(parsePayoutCurrency(creatorCurrency), rawAmount);
      finalAmount = toMajor(parsed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enter a valid amount");
      return;
    }

    if (withdrawThreshold === null) {
      toast.error(`Withdrawals are not configured for ${creatorCurrency}`);
      return;
    }

    if (finalAmount < withdrawThreshold) {
      toast.error(
        `Amount must be at least ${withdrawThreshold.toLocaleString()} ${getCurrencySymbol(creatorCurrency)}`,
      );
      return;
    }

    if (!withdrawQuote && finalAmount > pendingAmount) {
      if (hasOtherCurrencyBalances) {
        toast.error(
          "Get a conversion quote to withdraw using balances in other currencies",
        );
        return;
      }
      toast.error("Insufficient available balance");
      return;
    }

    const idempotencyKey = withdrawRequestKey ?? crypto.randomUUID();
    if (!withdrawRequestKey) setWithdrawRequestKey(idempotencyKey);

    setIsSubmitting(true);
    try {
      await submitWithdrawRequest({
        creatorUid: creator.uid,
        creatorName: creator.name,
        amount: rawAmount,
        currency: creatorCurrency,
        idempotencyKey,
        quoteId: withdrawQuote?.id,
      });
      setWithdrawRequestKey(null);
      setWithdrawQuote(null);
      const overview = await fetchPayoutOverview(creator as any);
      if (overview) {
        setCreatorCurrency(overview.creatorCurrency);
        setWithdrawThreshold(overview.withdrawThreshold);
        setPerCurrencyBalances(overview.perCurrencyBalances);
      }
      setWithdrawStep(2);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-canvas"
        role="status"
        aria-label="Loading payouts"
      >
        <Loader className="size-6 animate-spin text-brand-strong" aria-hidden="true" />
      </div>
    );

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <main className="mx-auto max-w-5xl p-4 sm:p-8">
        {view === "overview" ? (
          <div className="animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-display font-bold tracking-tight text-fg">Payouts</h1>
                <p className="mt-1 text-label text-muted-fg">
                  Simplicity and exclusive incentives.
                </p>
              </div>
              <Button
                size="lg"
                disabled={!canWithdraw}
                onClick={handleWithdrawInit}
                trailingIcon={<ArrowUpRight className="size-4" aria-hidden="true" />}
              >
                Request to Withdraw
              </Button>
            </header>

            {!isVerified && (
              <Card className="mb-8 flex flex-col gap-4 border-warning/30 bg-warning-bg/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-warning-bg text-warning">
                    <AlertCircle className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-body font-bold text-fg">
                      Identity Verification Required
                    </h4>
                    <p className="text-caption text-muted-fg">
                      Unlock payouts and set your destination.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="uppercase"
                  onClick={() => router.push("/creator/settings?tab=verification")}
                >
                  Verify Now
                </Button>
              </Card>
            )}

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-6">
                <p className="mb-4 text-caption font-bold uppercase tracking-widest text-muted-fg">
                  Available Balance
                </p>
                {perCurrencyBalances.map((b) => (
                  <h2 key={b.currency} className="text-title font-black text-fg">
                    {b.pending.toLocaleString()}{" "}
                    <span className="text-label font-bold text-muted-fg">
                      {getCurrencySymbol(b.currency)}
                    </span>
                  </h2>
                ))}
                {perCurrencyBalances.length > 1 && (
                  <div
                    className="mt-4 flex flex-wrap gap-2"
                    role="group"
                    aria-label="Select payout currency"
                  >
                    {perCurrencyBalances.map((b) => {
                      const selected = b.currency === creatorCurrency;
                      return (
                        <Button
                          key={b.currency}
                          type="button"
                          size="sm"
                          variant="secondary"
                          aria-pressed={selected}
                          onClick={() => selectPayoutCurrency(b)}
                          className={cn(
                            "rounded-pill px-3 text-caption font-black uppercase tracking-widest",
                            selected &&
                              "border-brand-strong bg-brand-soft text-brand-strong hover:bg-brand-soft",
                          )}
                        >
                          {b.currency}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {hasOtherCurrencyBalances && (
                  <p className="mt-3 text-caption text-muted-fg">
                    You can convert other currency balances at withdrawal (locked quote,
                    rates shown at request time).
                  </p>
                )}
              </Card>

              <Card className="p-6">
                <p className="mb-4 text-caption font-bold uppercase tracking-widest text-muted-fg">
                  Total Earnings
                </p>
                <div className="space-y-1">
                  {perCurrencyBalances.map((b) => (
                    <h2 key={b.currency} className="text-title font-black text-fg">
                      {b.earnings.toLocaleString()}{" "}
                      <span className="text-label font-bold text-muted-fg">
                        {getCurrencySymbol(b.currency)}
                      </span>
                    </h2>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <p className="mb-4 text-caption font-bold uppercase tracking-widest text-muted-fg">
                  Destination
                </p>
                {isVerified && (targetAccount.accountNumber || targetAccount.bankName || verificationRequest) ? (
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-caption font-black text-brand-strong">
                      {prefShort}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label font-bold text-fg">
                        {targetAccount.providerLabel}
                      </span>
                      {targetAccount.accountName && (
                        <span className="text-caption text-muted-fg">
                          {targetAccount.accountName}
                        </span>
                      )}
                      {targetAccount.accountNumber && (
                        <span className="font-mono text-caption text-muted-fg">
                          {maskPayoutNumber(targetAccount.accountNumber) || targetAccount.accountNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="underline"
                    onClick={() => router.push("/creator/settings?tab=verification")}
                  >
                    Not Verified
                  </Button>
                )}
              </Card>
            </div>

            <Card className="mb-8 space-y-6 p-6">
              <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                Progress to Payout Threshold
              </p>
              {perCurrencyBalances.map((b) => {
                const effective = b.convertiblePending ?? b.pending;
                const progress =
                  b.threshold === null
                    ? 0
                    : Math.min((effective / b.threshold) * 100, 100);
                return (
                  <div key={b.currency}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-label font-bold text-fg">
                        {b.currency} ({getCurrencySymbol(b.currency)})
                      </p>
                      <p className="text-label font-bold text-fg">
                        {b.pending.toLocaleString()}
                        {b.threshold === null
                          ? " / Not configured"
                          : ` / ${b.threshold.toLocaleString()} ${getCurrencySymbol(b.currency)}`}
                      </p>
                    </div>
                    <div
                      className="mb-1 h-3 w-full rounded-pill bg-surface-sunken"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${b.currency} payout threshold progress`}
                    >
                      <div
                        className="h-3 rounded-pill bg-brand-strong transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-caption text-muted-fg">
                      {b.threshold === null
                        ? "Withdrawals are not configured for this currency."
                        : b.pending >= b.threshold
                          ? "You've reached the payout threshold! You can now request a withdrawal."
                          : effective >= b.threshold
                            ? `Combined balances (~${effective.toLocaleString()} ${getCurrencySymbol(b.currency)}) meet the payout threshold with a conversion quote.`
                            : `You need ${Math.max(0, b.threshold - effective).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getCurrencySymbol(b.currency)} more to reach the payout threshold.`}
                    </p>
                  </div>
                );
              })}
            </Card>

            <Card className="overflow-hidden">
              <Tabs
                ariaLabel="Payout history"
                value={historyTab}
                onChange={setHistoryTab}
                items={[
                  { id: "payouts", label: "Payouts" },
                  { id: "requests", label: "Requests" },
                ]}
                className="bg-surface-raised/60 px-4 sm:px-6"
              />
              <div
                role="tabpanel"
                aria-label={historyTab === "payouts" ? "Payouts" : "Withdraw Requests"}
                className="divide-y divide-line"
              >
                {historyTab === "payouts" ? (
                  payouts.length === 0 ? (
                    <EmptyState msg="No payout history found" />
                  ) : (
                    payouts.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-raised"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-success-bg text-success">
                            <CheckCircle2 className="size-5" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-label font-bold text-fg">
                              {tx.method ? `${tx.method} payout` : "Payout"}
                            </p>
                            <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                              {tx.createdAt?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-label font-black text-fg tabular-nums">
                            -{tx.amount.toLocaleString()}{" "}
                            {getCurrencySymbol(resolveHistoricalCurrency(tx))}
                          </p>
                          <Badge tone="success" className="mt-1 uppercase">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    ))
                  )
                ) : requests.length === 0 ? (
                  <EmptyState msg="No requests found" />
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-raised"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-control",
                            req.status === "pending"
                              ? "bg-warning-bg text-warning"
                              : "bg-surface-sunken text-muted-fg",
                          )}
                        >
                          <Clock className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-label font-bold text-fg">
                            Withdrawal Request
                          </p>
                          <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                            {req.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-label font-black text-fg tabular-nums">
                          {req.amount.toLocaleString()}{" "}
                          {getCurrencySymbol(resolveHistoricalCurrency(req))}
                        </p>
                        <Badge
                          tone={
                            req.status === "pending"
                              ? "warning"
                              : req.status === "approved"
                                ? "success"
                                : "danger"
                          }
                          className="mt-1 uppercase"
                        >
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="mx-auto max-w-md py-10 animate-in slide-in-from-bottom-8 duration-500">
            <Button
              variant="ghost"
              className="mb-8 gap-2 uppercase tracking-widest text-muted-fg hover:text-fg"
              leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
              onClick={() => {
                setView("overview");
                setWithdrawStep(1);
                setWithdrawQuote(null);
              }}
            >
              Go Back
            </Button>

            {withdrawStep === 1 && (
              <Card className="space-y-8 p-6 shadow-card sm:p-8">
                <header>
                  <h2 className="text-display font-black uppercase tracking-tighter text-fg">
                    Withdraw Funds
                  </h2>
                  <p className="mt-2 text-label leading-relaxed text-muted-fg">
                    Your request will be reviewed and responded to within <b>48 hours</b>.
                  </p>
                </header>

                <div className="space-y-4">
                  <div
                    className="grid grid-cols-2 gap-3"
                    role="group"
                    aria-label="Withdrawal amount type"
                  >
                    <Button
                      variant={withdrawType === "all" ? "primary" : "secondary"}
                      aria-pressed={withdrawType === "all"}
                      onClick={() => {
                        setWithdrawType("all");
                        setWithdrawQuote(null);
                      }}
                    >
                      Withdraw All
                    </Button>
                    <Button
                      variant={withdrawType === "custom" ? "primary" : "secondary"}
                      aria-pressed={withdrawType === "custom"}
                      onClick={() => {
                        setWithdrawType("custom");
                        setWithdrawQuote(null);
                      }}
                    >
                      Custom Amount
                    </Button>
                  </div>

                  {withdrawType === "custom" && (
                    <Input
                      type="number"
                      min="0"
                      step={
                        1 /
                        10 **
                          getCurrencyDefinition(creatorCurrency as CurrencyCode).minorUnit
                      }
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setWithdrawQuote(null);
                      }}
                      placeholder={`Enter amount (${creatorCurrency})`}
                      aria-label={`Enter amount (${creatorCurrency})`}
                      className="text-body-lg font-black"
                    />
                  )}

                  {hasOtherCurrencyBalances && (
                    <div className="space-y-3 rounded-control border border-line bg-brand-soft p-4">
                      <p className="text-caption font-bold text-brand-strong">
                        You have balances in other currencies. Lock a conversion quote to
                        withdraw them in {creatorCurrency}.
                      </p>
                      <Button
                        fullWidth
                        disabled={quoteLoading}
                        onClick={handleGetQuote}
                        leadingIcon={
                          quoteLoading ? (
                            <Loader className="size-4 animate-spin" aria-hidden="true" />
                          ) : undefined
                        }
                      >
                        {quoteLoading ? "Getting quote..." : "Get conversion quote"}
                      </Button>
                    </div>
                  )}

                  {withdrawQuote && (
                    <div className="space-y-2 rounded-control border border-line bg-surface-raised/60 p-4">
                      <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Conversion breakdown ({withdrawQuote.payoutCurrency})
                      </p>
                      <p className="text-label font-black text-fg">
                        Payout:{" "}
                        {withdrawQuote.requestedPayoutAmountMajor.toLocaleString()}{" "}
                        {getCurrencySymbol(withdrawQuote.payoutCurrency)}
                      </p>
                      <div className="space-y-1">
                        {withdrawQuote.sources.map((s, i) => (
                          <p key={i} className="text-caption text-muted-fg">
                            {s.amountMajor.toLocaleString()}{" "}
                            {getCurrencySymbol(s.currency)}
                            {s.currency !== withdrawQuote.payoutCurrency
                              ? ` → ${s.payoutAmountMajor.toLocaleString()} ${getCurrencySymbol(withdrawQuote.payoutCurrency)} (rate ${s.effectiveRate.toFixed(6)})`
                              : " (no conversion)"}
                          </p>
                        ))}
                      </div>
                      <p className="text-caption text-muted-fg">
                        Quote expires:{" "}
                        {new Date(withdrawQuote.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-y border-line py-6 text-center">
                  <p className="mb-1 text-caption font-bold uppercase tracking-widest text-muted-fg">
                    Target Account
                  </p>
                  {targetAccount.accountNumber ? (
                    <>
                      <p className="font-black text-fg">
                        {maskPayoutNumber(targetAccount.accountNumber) ||
                          targetAccount.accountNumber}{" "}
                        ({targetAccount.providerLabel})
                      </p>
                      {targetAccount.accountName && (
                        <p className="mt-1 text-caption text-muted-fg">
                          {targetAccount.accountName}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-semibold text-warning">
                      No payout destination set
                    </p>
                  )}
                </div>

                <Button
                  fullWidth
                  size="lg"
                  className="py-7 text-body-lg"
                  onClick={submitRequest}
                  loading={isSubmitting}
                >
                  Request to Withdraw
                </Button>
              </Card>
            )}

            {withdrawStep === 2 && (
              <Card className="p-6 shadow-card sm:p-8">
                <StatusScreen
                  status="success"
                  title="Request Sent!"
                  description="We have received your request. Our team will verify the data and process your funds shortly."
                  primaryAction={{
                    label: "Done",
                    onClick: () => {
                      setView("overview");
                      setWithdrawStep(1);
                    },
                  }}
                />
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
