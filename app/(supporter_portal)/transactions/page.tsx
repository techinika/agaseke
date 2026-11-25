"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import {
  getUserTransactions,
  resumeTransaction,
  retryTransaction,
  type UserTransaction,
} from "@/lib/paymentsService";
import {
  downloadSuccessfulTransactionsPdf,
  isSuccessfulStatus,
} from "@/lib/payments/transactionPdf";
import { db } from "@/db/firebase";
import { collection, doc, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { formatCurrency } from "@/types/currency";
import { getCurrencyDefinition } from "@/lib/money/registry.generated";
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button, buttonClasses } from "@/components/ui/Button";
import {
  Loader2,
  Receipt,
  RotateCcw,
  RefreshCw,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ExternalLink,
  Download,
  FileText,
} from "lucide-react";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}, ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function typeLabel(type: string): string {
  switch (type) {
    case "store":
      return "Store purchase";
    case "booking":
      return "Booking";
    case "gathering":
      return "Gathering ticket";
    case "community":
      return "Subscription";
    default:
      return "Support";
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "successful":
      return "text-success";
    case "pending":
      return "text-warning";
    case "failed":
      return "text-danger";
    default:
      return "text-muted-fg";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "successful":
      return "Successful";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

const FILTERS = ["all", "successful", "pending", "failed"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  successful: "Successful",
  pending: "Pending",
  failed: "Failed",
};

function transactionTitle(tx: UserTransaction): string {
  if (tx.type === "store") return tx.productName || "Store purchase";
  if (tx.type === "community") return "Community subscription";
  if (tx.type === "gathering") return "Gathering ticket";
  if (tx.type === "booking") return "Booking";
  return "Support contribution";
}

function formatMinorUnits(minor: number, currency: string): string {
  if (!Number.isFinite(minor) || minor <= 0 || !currency) return "";
  let factor = 1;
  try {
    factor = 10 ** getCurrencyDefinition(currency as never).minorUnit;
  } catch {
    factor = 1;
  }
  return formatCurrency(minor / factor, currency);
}

function hasOriginalCharge(tx: UserTransaction): boolean {
  return (
    Boolean(tx.sourceCurrency) &&
    Boolean(tx.currency) &&
    tx.sourceCurrency !== tx.currency &&
    tx.sourceAmountMinor > 0
  );
}

const CARD_LINK_FRESH_MS = 15 * 60 * 1000;

function sanitizeCheckoutUrl(raw?: string): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw.trim());
    if (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    ) {
      return parsed.toString();
    }
  } catch {
    // ignore malformed URL
  }
  return "";
}

function isCardTransaction(tx: UserTransaction): boolean {
  return (
    tx.paymentMethod === "card" ||
    tx.ref.startsWith("AGS-CARD-") ||
    Boolean(tx.redirectUrl)
  );
}

function isFreshCardLink(tx: UserTransaction): boolean {
  const safeUrl = sanitizeCheckoutUrl(tx.redirectUrl);
  if (!safeUrl) return false;
  const tsRaw = tx.redirectUrlGeneratedAt || tx.createdAt;
  if (!tsRaw) return false;
  const tsMs = Date.parse(tsRaw);
  if (!Number.isFinite(tsMs)) return false;
  return Date.now() - tsMs < CARD_LINK_FRESH_MS;
}

interface ActiveRetry {
  oldRef: string;
  newRef: string;
  method: string;
  redirectUrl?: string;
  phase: "initiating" | "confirming" | "success" | "failed";
  message?: string;
}

export default function TransactionsPage() {
  const { isLoggedIn, user, profile } = useAuth();
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    successful: 0,
    pending: 0,
    failed: 0,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [activeRetry, setActiveRetry] = useState<ActiveRetry | null>(null);
  const [momoDialogTx, setMomoDialogTx] = useState<{
    tx: UserTransaction;
    mode: "resume" | "retry";
  } | null>(null);
  const [momoPhone, setMomoPhone] = useState("");
  const [submittingMomoDialog, setSubmittingMomoDialog] = useState(false);
  const unsubscribeRetryRef = useRef<(() => void) | null>(null);

  const stopListening = () => {
    if (unsubscribeRetryRef.current) {
      unsubscribeRetryRef.current();
      unsubscribeRetryRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  const applyFirstPage = (limit: number) =>
    getUserTransactions(limit, 0).then((data) => {
      setTransactions(data.transactions);
      setTotal(data.total);
      setCounts(data.counts);
    });

  useEffect(() => {
    if (!isLoggedIn) return;
    applyFirstPage(PAGE_SIZE)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const refreshTransactions = async () => {
    setRefreshing(true);
    try {
      await applyFirstPage(PAGE_SIZE);
    } catch {
      // keep existing rows visible
    } finally {
      setRefreshing(false);
    }
  };

  const resolveMissingCreatorNames = async (
    items: UserTransaction[],
  ): Promise<Record<string, string>> => {
    const missingHandles = [
      ...new Set(
        items
          .filter((tx) => isSuccessfulStatus(tx.status) && !tx.creatorName && tx.creatorId)
          .map((tx) => tx.creatorId),
      ),
    ];
    const resolved: Record<string, string> = {};
    if (missingHandles.length === 0) return resolved;

    await Promise.all(
      missingHandles.map(async (handle) => {
        try {
          const snap = await getDoc(doc(db, "creators", handle));
          if (snap.exists()) {
            const creatorName = snap.data()?.name;
            if (typeof creatorName === "string" && creatorName.trim()) {
              resolved[handle] = creatorName.trim();
            }
          }
        } catch {
          // ignore lookup failure and fall back to handle
        }
      }),
    );
    return resolved;
  };

  const handleDownloadSummaryPdf = async () => {
    setExportingPdf(true);
    try {
      let allItems = [...transactions];
      if (allItems.length < total) {
        let offset = allItems.length;
        while (offset < total) {
          const page = await getUserTransactions(50, offset);
          if (page.transactions.length === 0) break;
          allItems = [...allItems, ...page.transactions];
          offset += page.transactions.length;
        }
      }

      const successfulItems = allItems.filter((tx) => isSuccessfulStatus(tx.status));
      if (successfulItems.length === 0) {
        toast.error("No successful transactions to export.");
        return;
      }

      const creatorNames = await resolveMissingCreatorNames(successfulItems);
      const { count } = await downloadSuccessfulTransactionsPdf(successfulItems, {
        supporterName: profile?.displayName || user?.displayName || "",
        supporterEmail: profile?.email || user?.email || "",
        creatorNames,
      });
      toast.success(
        `Downloaded PDF summary for ${count} successful transaction${count === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate PDF summary",
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadSingleReceipt = async (tx: UserTransaction) => {
    setDownloadingRef(tx.ref);
    try {
      const creatorNames = await resolveMissingCreatorNames([tx]);
      await downloadSuccessfulTransactionsPdf([tx], {
        supporterName: profile?.displayName || user?.displayName || "",
        supporterEmail: profile?.email || user?.email || "",
        creatorNames,
        title: "Successful Transaction Receipt",
        filenamePrefix: `agaseke-receipt-${tx.ref}`,
      });
      toast.success("Downloaded transaction receipt PDF.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate receipt PDF",
      );
    } finally {
      setDownloadingRef(null);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await getUserTransactions(PAGE_SIZE, transactions.length);
      setTransactions((prev) => [...prev, ...data.transactions]);
      setTotal(data.total);
      setCounts(data.counts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load more transactions");
    } finally {
      setLoadingMore(false);
    }
  };

  const listenForPayment = (
    newRef: string,
    oldRef: string,
    method: string,
    redirectUrl?: string,
  ) => {
    stopListening();
    const q = query(collection(db, "transactions"), where("ref", "==", newRef));
    unsubscribeRetryRef.current = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const data = snapshot.docs[0].data();
      if (data.status === "successful" || data.status === "success") {
        stopListening();
        setActiveRetry({ oldRef, newRef, method, redirectUrl, phase: "success" });
        toast.success("Payment completed successfully!");
        refreshTransactions();
      } else if (data.status === "failed") {
        stopListening();
        setActiveRetry({
          oldRef,
          newRef,
          method,
          redirectUrl,
          phase: "failed",
          message: "The payment was declined.",
        });
        toast.error("The payment was declined.");
        refreshTransactions();
      }
    });
  };

  const executeResumeOrRetry = async (
    tx: UserTransaction,
    mode: "resume" | "retry",
    phone?: string,
  ) => {
    stopListening();
    setActiveRetry({
      oldRef: tx.ref,
      newRef: "",
      method: tx.paymentMethod || "momo",
      phase: "initiating",
    });
    let newRef = "";
    try {
      const result =
        mode === "resume"
          ? await resumeTransaction(tx.ref, phone)
          : await retryTransaction(tx.ref, phone);
      newRef = result.ref;
      if (result.method === "card") {
        const safeRedirect = sanitizeCheckoutUrl(result.redirect_url);
        setActiveRetry({
          oldRef: tx.ref,
          newRef: result.ref,
          method: "card",
          redirectUrl: safeRedirect || undefined,
          phase: "confirming",
          message: "Complete your card payment in the checkout link below.",
        });
        if (safeRedirect && typeof window !== "undefined") {
          window.open(safeRedirect, "_blank", "noopener,noreferrer");
        }
        listenForPayment(result.ref, tx.ref, "card", safeRedirect || undefined);
      } else {
        setActiveRetry({
          oldRef: tx.ref,
          newRef: result.ref,
          method: "momo",
          phase: "confirming",
          message: "A payment request was sent to your phone. Confirm it and wait for confirmation.",
        });
        listenForPayment(result.ref, tx.ref, "momo");
      }
    } catch (err) {
      setActiveRetry({
        oldRef: tx.ref,
        newRef,
        method: isCardTransaction(tx) ? "card" : tx.paymentMethod || "momo",
        phase: "failed",
        message: err instanceof Error ? err.message : "Failed to process payment",
      });
      toast.error(err instanceof Error ? err.message : "Failed to process payment");
    }
  };

  const handleActionClick = (tx: UserTransaction, mode: "resume" | "retry") => {
    if (isCardTransaction(tx)) {
      const safeRedirect = sanitizeCheckoutUrl(tx.redirectUrl);
      if (mode === "resume" && safeRedirect && isFreshCardLink(tx)) {
        stopListening();
        setActiveRetry({
          oldRef: tx.ref,
          newRef: tx.ref,
          method: "card",
          redirectUrl: safeRedirect,
          phase: "confirming",
          message: "Complete your card payment in the checkout link below.",
        });
        if (typeof window !== "undefined") {
          window.open(safeRedirect, "_blank", "noopener,noreferrer");
        }
        listenForPayment(tx.ref, tx.ref, "card", safeRedirect);
        return;
      }
      void executeResumeOrRetry(tx, mode);
      return;
    }

    setMomoPhone(tx.phone || "");
    setMomoDialogTx({ tx, mode });
  };

  const submitMomoDialog = async () => {
    if (!momoDialogTx) return;
    const cleaned = momoPhone.replace(/\s+/g, "").trim();
    if (!cleaned || cleaned.length < 9) {
      toast.error("Enter a valid Mobile Money phone number");
      return;
    }
    setSubmittingMomoDialog(true);
    const { tx, mode } = momoDialogTx;
    setMomoDialogTx(null);
    await executeResumeOrRetry(tx, mode, cleaned);
    setSubmittingMomoDialog(false);
  };

  const cancelRetry = () => {
    stopListening();
    setActiveRetry(null);
  };

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.status === filter)),
    [transactions, filter],
  );

  const hasMore = transactions.length < total;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
            Account
          </p>
          <h1 className="mt-1 text-heading font-bold tracking-tight text-fg">
            Transactions
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Your payments across support, store orders, bookings, gatherings, and subscriptions.
          </p>
        </div>
        {isLoggedIn && !loading && !error && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadSummaryPdf}
              loading={exportingPdf}
              disabled={(counts.successful || 0) === 0}
              aria-label="Download PDF summary of successful transactions"
              leadingIcon={<Download className="size-4" aria-hidden="true" />}
            >
              <span>Download PDF</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshTransactions}
              loading={refreshing}
              aria-label="Refresh transactions"
              leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}
              className="min-w-11 px-0 sm:px-3"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        )}
      </div>

      {!isLoggedIn ? (
        <EmptyState
          icon={<Receipt className="size-6" aria-hidden="true" />}
          title="Log in to view your transactions"
          description="Sign in to track payments, receipts, and retries."
          action={
            <Link href="/login" className={buttonClasses({ variant: "primary" })}>
              Log in
            </Link>
          }
        />
      ) : loading ? (
        <LoadingState variant="list" label="Loading transactions" />
      ) : error ? (
        <EmptyState
          icon={<XCircle className="size-6 text-danger" aria-hidden="true" />}
          title="Could not load transactions"
          description={error}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setLoading(true);
                applyFirstPage(PAGE_SIZE)
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : "Failed to load transactions"),
                  )
                  .finally(() => setLoading(false));
              }}
              leadingIcon={<RotateCcw className="size-4" aria-hidden="true" />}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line pb-px" role="tablist" aria-label="Filter transactions">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-label font-semibold transition-colors ${
                    active
                      ? "border-brand-strong text-fg"
                      : "border-transparent text-muted-fg hover:text-fg"
                  }`}
                >
                  {FILTER_LABELS[f]}
                  <span className="ml-1.5 text-caption text-muted-fg">
                    {counts[f] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {activeRetry && (
            <div
              className={`mb-6 rounded-card border p-4 ${
                activeRetry.phase === "success"
                  ? "border-success/30 bg-success-bg"
                  : activeRetry.phase === "failed"
                    ? "border-danger/30 bg-danger-bg"
                    : "border-warning/30 bg-warning-bg"
              }`}
            >
              <div className="flex items-start gap-3">
                {activeRetry.phase === "initiating" || activeRetry.phase === "confirming" ? (
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-warning" aria-hidden="true" />
                ) : activeRetry.phase === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                )}
                <div className="text-label">
                  <p className="font-bold text-fg">
                    {activeRetry.phase === "initiating"
                      ? "Starting payment…"
                      : activeRetry.phase === "confirming"
                        ? activeRetry.method === "card"
                          ? "Card payment ready"
                          : "Waiting for mobile money confirmation"
                        : activeRetry.phase === "success"
                          ? "Payment completed"
                          : "Payment failed"}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-fg">
                    {activeRetry.phase === "confirming"
                      ? activeRetry.message || "Confirm the payment and we'll update this automatically."
                      : activeRetry.phase === "success"
                        ? "Your transaction list has been refreshed."
                        : activeRetry.message || "You can try again below."}
                  </p>
                  {activeRetry.method === "card" &&
                    activeRetry.phase === "confirming" &&
                    sanitizeCheckoutUrl(activeRetry.redirectUrl) && (
                      <a
                        href={sanitizeCheckoutUrl(activeRetry.redirectUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-caption font-semibold text-brand-strong hover:underline"
                      >
                        Open checkout page <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                </div>
                <button
                  type="button"
                  onClick={cancelRetry}
                  className="ml-auto shrink-0 text-caption font-semibold text-muted-fg hover:text-fg"
                >
                  {activeRetry.phase === "success" || activeRetry.phase === "failed" ? "Dismiss" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="size-6" aria-hidden="true" />}
              title={transactions.length === 0 ? "No payments yet" : "No matching transactions"}
              description={
                transactions.length === 0
                  ? "Receipts for support, orders, bookings, and tickets appear here."
                  : "Try switching tabs above to view other transactions."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((tx) => {
                const isRetryingThis =
                  activeRetry !== null &&
                  activeRetry.oldRef === tx.ref &&
                  (activeRetry.phase === "initiating" || activeRetry.phase === "confirming");
                const isCard = isCardTransaction(tx);
                return (
                  <Card key={tx.ref} className="p-4 sm:p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body font-bold text-fg">
                          {transactionTitle(tx)}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-fg">
                          {typeLabel(tx.type)}
                          {(isCard || tx.paymentMethod) ? ` · ${isCard ? "Card" : "MoMo"}` : ""}
                          {tx.attendeeName ? ` · ${tx.attendeeName}` : ""}
                          {tx.message ? ` · “${tx.message}”` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-caption font-semibold ${statusTone(tx.status)}`}>
                        {statusLabel(tx.status)}
                      </span>
                    </div>

                    {tx.creatorId && (
                      <Link
                        href={`/${tx.creatorId}`}
                        className="mb-2 inline-flex items-center gap-1 text-caption font-semibold text-brand-strong hover:underline"
                      >
                        <Receipt className="size-3" aria-hidden="true" /> Paid to @{tx.creatorId}
                        {tx.creatorName ? ` · ${tx.creatorName}` : ""}
                      </Link>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <div>
                        <p className="text-title font-bold text-fg tabular-nums">
                          {formatCurrency(
                            tx.amount,
                            resolveHistoricalCurrency(tx as unknown as Record<string, unknown>),
                          )}
                        </p>
                        {hasOriginalCharge(tx) && (
                          <p className="mt-0.5 text-caption text-muted-fg">
                            Original {formatMinorUnits(tx.sourceAmountMinor, tx.sourceCurrency)} · charged in {tx.currency}
                          </p>
                        )}
                        <p className="mt-0.5 text-caption text-muted-fg">
                          {formatDate(tx.createdAt)} · {tx.ref}
                        </p>
                      </div>
                      {isSuccessfulStatus(tx.status) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleDownloadSingleReceipt(tx)}
                          loading={downloadingRef === tx.ref}
                          leadingIcon={<FileText className="size-4" aria-hidden="true" />}
                        >
                          Receipt PDF
                        </Button>
                      ) : (tx.status === "failed" || tx.status === "pending") && (
                        <Button
                          size="sm"
                          variant={tx.status === "pending" ? "secondary" : "primary"}
                          onClick={() =>
                            handleActionClick(
                              tx,
                              tx.status === "pending" ? "resume" : "retry",
                            )
                          }
                          loading={isRetryingThis}
                          leadingIcon={
                            isCard ? (
                              <CreditCard className="size-4" aria-hidden="true" />
                            ) : (
                              <Smartphone className="size-4" aria-hidden="true" />
                            )
                          }
                        >
                          {isRetryingThis
                            ? "Processing…"
                            : tx.status === "pending"
                              ? "Complete payment"
                              : "Pay again"}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-6 text-center">
              <Button
                variant="secondary"
                onClick={loadMore}
                loading={loadingMore}
                leadingIcon={<ChevronDown className="size-4" aria-hidden="true" />}
              >
                Load more ({transactions.length} of {total})
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!momoDialogTx}
        onClose={() => setMomoDialogTx(null)}
        title={
          momoDialogTx?.mode === "resume"
            ? "Complete Mobile Money payment"
            : "Retry Mobile Money payment"
        }
        description="Confirm or enter the Mobile Money number where you want to receive the payment prompt."
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setMomoDialogTx(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={submittingMomoDialog}
              onClick={() => void submitMomoDialog()}
              disabled={!momoPhone.trim()}
            >
              Send prompt
            </Button>
          </div>
        }
      >
        {momoDialogTx && (
          <div className="space-y-4">
            <div className="rounded-control border border-line bg-surface-raised p-3 text-label">
              <p className="font-semibold text-fg">
                {transactionTitle(momoDialogTx.tx)}
              </p>
              <p className="mt-0.5 font-bold tabular-nums text-brand-strong">
                {formatCurrency(
                  momoDialogTx.tx.amount,
                  resolveHistoricalCurrency(
                    momoDialogTx.tx as unknown as Record<string, unknown>,
                  ),
                )}
              </p>
            </div>
            <Input
              label="Mobile Money phone number"
              hint="Example: 078 000 0000"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="078 000 0000"
              value={momoPhone}
              onChange={(e) => setMomoPhone(e.target.value)}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}