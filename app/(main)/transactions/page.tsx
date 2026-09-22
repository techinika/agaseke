"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import {
  getUserTransactions,
  retryTransaction,
  type UserTransaction,
} from "@/lib/paymentsService";
import { db } from "@/db/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { formatCurrency } from "@/types/currency";
import { toast } from "sonner";
import {
  Loader,
  Receipt,
  RotateCcw,
  RefreshCw,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  ChevronDown,
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

function statusBadge(status: string): string {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
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

function transactionTitle(tx: UserTransaction): string {
  if (tx.type === "store") return tx.productName || "Store purchase";
  if (tx.type === "community") return "Community subscription";
  if (tx.type === "gathering") return "Gathering ticket";
  if (tx.type === "booking") return "Booking";
  return "Support contribution";
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
  const { isLoggedIn } = useAuth();
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [activeRetry, setActiveRetry] = useState<ActiveRetry | null>(null);
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

  const refreshTransactions = () => {
    applyFirstPage(PAGE_SIZE).catch(() => {});
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
    redirectUrl?: string
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

  const handleRetry = async (tx: UserTransaction) => {
    stopListening();
    setActiveRetry({
      oldRef: tx.ref,
      newRef: "",
      method: tx.paymentMethod,
      phase: "initiating",
    });
    let newRef = "";
    try {
      const result = await retryTransaction(tx.ref);
      newRef = result.ref;
      if (result.method === "card") {
        setActiveRetry({
          oldRef: tx.ref,
          newRef: result.ref,
          method: "card",
          redirectUrl: result.redirect_url,
          phase: "confirming",
        });
        const popup = window.open(result.redirect_url, "_blank");
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          setActiveRetry({
            oldRef: tx.ref,
            newRef: result.ref,
            method: "card",
            redirectUrl: result.redirect_url,
            phase: "confirming",
            message: "Your browser blocked the payment window. Use the link below to finish paying.",
          });
        }
        listenForPayment(result.ref, tx.ref, "card", result.redirect_url);
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
        method: tx.paymentMethod,
        phase: "failed",
        message: err instanceof Error ? err.message : "Failed to retry payment",
      });
      toast.error(err instanceof Error ? err.message : "Failed to retry payment");
    }
  };

  const cancelRetry = () => {
    stopListening();
    setActiveRetry(null);
  };

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.status === filter)),
    [transactions, filter]
  );

  const hasMore = transactions.length < total;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Your payments across support, store, bookings, gatherings, and
          subscriptions.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="text-center py-16">
          <Receipt size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Log in to see your transactions.
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Log in
          </Link>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={() => {
              setError("");
              setLoading(true);
              applyFirstPage(PAGE_SIZE)
                .catch((err: unknown) =>
                  setError(err instanceof Error ? err.message : "Failed to load transactions")
                )
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-orange-600 border border-border rounded-lg hover:bg-muted transition"
          >
            <RotateCcw size={14} /> Try again
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-bold rounded-full border transition ${
                  filter === f
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "successful"
                    ? "Successful"
                    : f === "pending"
                      ? "Pending"
                      : "Failed"}
                <span className="ml-1.5 text-xs opacity-70">
                  {counts[f as string] || 0}
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setLoading(true);
                refreshTransactions();
                setTimeout(() => setLoading(false), 0);
              }}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground border border-border rounded-full hover:text-foreground transition"
              title="Refresh statuses"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {activeRetry && (
            <div
              className={`mb-6 border rounded-xl p-4 ${
                activeRetry.phase === "success"
                  ? "bg-green-50 dark:bg-green-950 border-green-300"
                  : activeRetry.phase === "failed"
                    ? "bg-red-50 dark:bg-red-950 border-red-300"
                    : "bg-amber-50 dark:bg-amber-950 border-amber-300"
              }`}
            >
              <div className="flex items-start gap-3">
                {activeRetry.phase === "initiating" || activeRetry.phase === "confirming" ? (
                  <Loader className="animate-spin text-amber-600 shrink-0 mt-0.5" size={18} />
                ) : activeRetry.phase === "success" ? (
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
                ) : (
                  <XCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                )}
                <div className="text-sm">
                  <p className="font-bold text-foreground">
                    {activeRetry.phase === "initiating"
                      ? "Starting payment…"
                      : activeRetry.phase === "confirming"
                        ? activeRetry.method === "card"
                          ? "Card payment in progress"
                          : "Waiting for mobile money confirmation"
                        : activeRetry.phase === "success"
                          ? "Payment completed"
                          : "Payment failed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeRetry.phase === "confirming"
                      ? activeRetry.message ||
                        "Confirm the payment and we'll update this automatically."
                      : activeRetry.phase === "success"
                        ? "Your transaction list has been refreshed."
                        : activeRetry.message || "You can try again below."}
                  </p>
                  {activeRetry.method === "card" &&
                    activeRetry.phase === "confirming" &&
                    activeRetry.redirectUrl && (
                      <a
                        href={activeRetry.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs font-bold text-orange-600 underline"
                      >
                        Open the payment window again
                      </a>
                    )}
                </div>
<button
                  onClick={cancelRetry}
                  className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground shrink-0"
                >
                  {activeRetry.phase === "success" || activeRetry.phase === "failed"
                    ? "Dismiss"
                    : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <Receipt size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {transactions.length === 0
                  ? "You haven't made any payments yet."
                  : "No transactions in this filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((tx) => {
                const isRetryingThis =
                  activeRetry !== null &&
                  activeRetry.oldRef === tx.ref &&
                  (activeRetry.phase === "initiating" ||
                    activeRetry.phase === "confirming");
                return (
                  <div
                    key={tx.ref}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {transactionTitle(tx)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {typeLabel(tx.type)}
                          {tx.paymentMethod ? ` · ${tx.paymentMethod === "card" ? "Card" : "MoMo"}` : ""}
                          {tx.attendeeName ? ` · ${tx.attendeeName}` : ""}
                          {tx.message ? ` · “${tx.message}”` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge(tx.status)}`}
                      >
                        {statusLabel(tx.status)}
                      </span>
                    </div>

                    {tx.creatorId && (
                      <Link
                        href={`/${tx.creatorId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline mb-2"
                      >
                        <Receipt size={12} /> Paid to @{tx.creatorId}
                        {tx.creatorName ? ` · ${tx.creatorName}` : ""}
                      </Link>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div>
                        <p className="text-lg font-black text-foreground">
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(tx.createdAt)} · {tx.ref}
                        </p>
                      </div>
                      {tx.status === "failed" && (
                        <button
                          onClick={() => handleRetry(tx)}
                          disabled={isRetryingThis}
                          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isRetryingThis ? (
                            <Loader className="animate-spin" size={15} />
                          ) : tx.paymentMethod === "card" ? (
                            <CreditCard size={15} />
                          ) : (
                            <Smartphone size={15} />
                          )}
                          {isRetryingThis ? "Retrying…" : "Pay again"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-foreground bg-card border border-border rounded-full hover:bg-muted transition disabled:opacity-60"
              >
                {loadingMore ? (
                  <Loader className="animate-spin text-orange-500" size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                Load more
                <span className="text-xs text-muted-foreground">
                  · {transactions.length} of {total}
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}