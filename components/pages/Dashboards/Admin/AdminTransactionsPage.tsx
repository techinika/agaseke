"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  Receipt,
  RefreshCw,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/db/firebase";
import { formatCurrency } from "@/types/currency";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

export interface AdminTransactionItem {
  id: string;
  ref: string;
  providerRef: string;
  orderTrackingId: string;
  type: string;
  status: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  sourceCurrency: string;
  sourceAmountMinor: number;
  fxRate: number;
  creatorId: string;
  creatorUid: string;
  creatorName: string;
  supporterId: string;
  initiatedBy: string;
  payerName: string;
  payerEmail: string;
  phone: string;
  productId: string;
  productName: string;
  message: string;
  createdAt: string;
  successfulAt: string;
  stalledAt: string;
  cancelledAt: string;
  failedAt: string;
  retriedRef: string;
  retryOfRef: string;
  redirectUrl: string;
}

interface AdminTransactionsResponse {
  transactions: AdminTransactionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<string, number>;
}

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "successful", label: "Successful" },
  { id: "pending", label: "Pending" },
  { id: "stalled", label: "Stalled" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "support", label: "Support" },
  { value: "gift", label: "Gift" },
  { value: "store", label: "Store" },
  { value: "booking", label: "Booking" },
  { value: "gathering", label: "Gathering" },
  { value: "community", label: "Community" },
] as const;

const METHOD_OPTIONS = [
  { value: "all", label: "All methods" },
  { value: "momo", label: "MoMo" },
  { value: "card", label: "Card" },
] as const;

const PAGE_SIZES = [25, 50, 100] as const;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}, ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "successful":
      return "bg-success-bg text-success border-success/30";
    case "pending":
    case "stalled":
      return "bg-warning-bg text-warning border-warning/30";
    case "failed":
      return "bg-danger-bg text-danger border-danger/30";
    case "cancelled":
      return "bg-surface-sunken text-muted-fg border-line";
    default:
      return "bg-surface-sunken text-muted-fg border-line";
  }
}

function statusLabel(status: string): string {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function typeLabel(type: string): string {
  switch (type) {
    case "store":
      return "Store";
    case "booking":
      return "Booking";
    case "gathering":
      return "Gathering";
    case "community":
      return "Community";
    case "gift":
      return "Gift";
    default:
      return "Support";
  }
}

function sanitizeUrl(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    ) {
      return parsed.toString();
    }
  } catch {
    // ignore malformed URLs
  }
  return "";
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    successful: 0,
    pending: 0,
    stalled: 0,
    failed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryTransactions = useCallback(async (): Promise<AdminTransactionsResponse> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Admin authentication required");
    }
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status: statusFilter,
      type: typeFilter,
      method: methodFilter,
    });
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as Partial<AdminTransactionsResponse> & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Failed to load transactions");
    }
    return {
      transactions: data.transactions || [],
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || pageSize,
      totalPages: data.totalPages || 1,
      counts: data.counts || {
        all: 0,
        successful: 0,
        pending: 0,
        stalled: 0,
        failed: 0,
        cancelled: 0,
      },
    };
  }, [page, pageSize, statusFilter, typeFilter, methodFilter, searchQuery]);

  const applyResponse = (data: AdminTransactionsResponse) => {
    setTransactions(data.transactions);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setCounts(data.counts);
  };

  useEffect(() => {
    let active = true;
    queryTransactions()
      .then((data) => {
        if (!active) return;
        setError("");
        applyResponse(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryTransactions]);

  const handleRefresh = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await queryTransactions();
      applyResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const exportCurrentPageCsv = () => {
    if (transactions.length === 0) {
      toast.error("No transactions on this page to export.");
      return;
    }
    const headers = [
      "Reference",
      "Created At",
      "Status",
      "Type",
      "Method",
      "Amount",
      "Currency",
      "Creator",
      "Payer Name",
      "Payer Email",
      "Phone",
    ];
    const escapeCell = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = transactions.map((tx) =>
      [
        tx.ref,
        tx.createdAt,
        tx.status,
        tx.type,
        tx.paymentMethod,
        tx.amount,
        tx.currency,
        tx.creatorName || tx.creatorId,
        tx.payerName,
        tx.payerEmail,
        tx.phone,
      ]
        .map(escapeCell)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agaseke-transactions-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported current page to CSV.");
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
              Payments
            </p>
            <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
              Transactions
            </h1>
            <p className="mt-1 text-label text-muted-fg">
              Monitor every transaction across support, store orders, bookings, gatherings, and subscriptions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportCurrentPageCsv}
              disabled={loading || transactions.length === 0}
              leadingIcon={<Download className="size-4" aria-hidden="true" />}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              onClick={() => void handleRefresh(true)}
              leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </div>
        </header>

        <div
          className="mb-5 flex gap-1 overflow-x-auto border-b border-line pb-px"
          role="tablist"
          aria-label="Filter transactions by status"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-label font-semibold transition-colors",
                  active
                    ? "border-brand-strong text-fg"
                    : "border-transparent text-muted-fg hover:text-fg",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-caption text-muted-fg tabular-nums">
                  {counts[tab.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search ref, creator, email, phone, or product…"
              aria-label="Search transactions"
              className="h-10 w-full rounded-control border border-line bg-surface pr-3 pl-9 text-label text-fg placeholder:text-muted-fg focus:border-brand-strong focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter by transaction type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-control border border-line bg-surface px-3 text-label text-fg focus:border-brand-strong focus:outline-none"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by payment method"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-control border border-line bg-surface px-3 text-label text-fg focus:border-brand-strong focus:outline-none"
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState variant="list" label="Loading transactions" />
        ) : error ? (
          <EmptyState
            icon={<Receipt className="size-6 text-danger" aria-hidden="true" />}
            title="Could not load transactions"
            description={error}
            action={
              <Button variant="secondary" onClick={() => void handleRefresh(false)}>
                Try again
              </Button>
            }
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" aria-hidden="true" />}
            title="No matching transactions"
            description="Adjust your search query or filters to view transactions."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
              <table className="w-full border-collapse text-left text-label">
                <thead>
                  <tr className="border-b border-line bg-surface-raised text-caption font-semibold uppercase tracking-wide text-muted-fg">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Creator</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-surface-raised/60"
                    >
                      <td className="px-4 py-3 font-mono text-caption font-semibold text-fg">
                        {tx.ref}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">
                          {tx.creatorName || (tx.creatorId ? `@${tx.creatorId}` : "—")}
                        </p>
                        {tx.creatorId && tx.creatorName && (
                          <p className="text-caption text-muted-fg">@{tx.creatorId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-fg">
                          {tx.payerName || tx.payerEmail || tx.phone || "Anonymous"}
                        </p>
                        {(tx.payerEmail || tx.phone) && tx.payerName && (
                          <p className="text-caption text-muted-fg">
                            {tx.payerEmail || tx.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-label text-fg">
                          {tx.paymentMethod === "card" ? (
                            <CreditCard className="size-3.5 text-muted-fg" aria-hidden="true" />
                          ) : (
                            <Smartphone className="size-3.5 text-muted-fg" aria-hidden="true" />
                          )}
                          {typeLabel(tx.type)} · {tx.paymentMethod === "card" ? "Card" : "MoMo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-fg">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-control border px-2 py-0.5 text-caption font-semibold",
                            statusBadgeClasses(tx.status),
                          )}
                        >
                          {statusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-caption text-muted-fg tabular-nums">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTx(tx)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {transactions.map((tx) => (
                <Card key={tx.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-caption font-bold text-fg">
                        {tx.ref}
                      </p>
                      <p className="mt-0.5 text-label font-semibold text-fg">
                        {tx.creatorName || (tx.creatorId ? `@${tx.creatorId}` : "—")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-control border px-2 py-0.5 text-caption font-semibold",
                        statusBadgeClasses(tx.status),
                      )}
                    >
                      {statusLabel(tx.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <div>
                      <p className="text-title font-bold tabular-nums text-fg">
                        {formatCurrency(tx.amount, tx.currency)}
                      </p>
                      <p className="text-caption text-muted-fg">
                        {typeLabel(tx.type)} · {tx.paymentMethod === "card" ? "Card" : "MoMo"} ·{" "}
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedTx(tx)}
                    >
                      Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-line pt-4 sm:flex-row">
              <div className="flex items-center gap-3 text-label text-muted-fg">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {total}
                </span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded-control border border-line bg-surface px-2.5 text-caption text-fg focus:border-brand-strong focus:outline-none"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leadingIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
                >
                  Previous
                </Button>
                <span className="px-2 text-label font-semibold tabular-nums text-fg">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  trailingIcon={<ChevronRight className="size-4" aria-hidden="true" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Transaction ${selectedTx.ref} details`}
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <p className="font-mono text-caption font-semibold text-muted-fg">
                  {selectedTx.ref}
                </p>
                <h2 className="mt-0.5 text-title font-bold text-fg">
                  {formatCurrency(selectedTx.amount, selectedTx.currency)}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setSelectedTx(null)}
                className="rounded-control p-1.5 text-muted-fg hover:bg-surface-sunken hover:text-fg"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-label">
              <div>
                <dt className="text-caption text-muted-fg">Status</dt>
                <dd className="font-semibold text-fg">{statusLabel(selectedTx.status)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Type / Method</dt>
                <dd className="font-semibold text-fg">
                  {typeLabel(selectedTx.type)} · {selectedTx.paymentMethod === "card" ? "Card" : "MoMo"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Creator</dt>
                <dd className="font-semibold text-fg">
                  {selectedTx.creatorName || "—"} {selectedTx.creatorId ? `(@${selectedTx.creatorId})` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Payer</dt>
                <dd className="font-semibold text-fg">
                  {selectedTx.payerName || "Anonymous"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Email / Phone</dt>
                <dd className="break-all text-fg">
                  {[selectedTx.payerEmail, selectedTx.phone].filter(Boolean).join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Created</dt>
                <dd className="text-fg">{formatDate(selectedTx.createdAt)}</dd>
              </div>
              {selectedTx.successfulAt && (
                <div>
                  <dt className="text-caption text-muted-fg">Successful at</dt>
                  <dd className="text-fg">{formatDate(selectedTx.successfulAt)}</dd>
                </div>
              )}
              {selectedTx.stalledAt && (
                <div>
                  <dt className="text-caption text-muted-fg">Stalled at</dt>
                  <dd className="text-fg">{formatDate(selectedTx.stalledAt)}</dd>
                </div>
              )}
              {selectedTx.cancelledAt && (
                <div>
                  <dt className="text-caption text-muted-fg">Cancelled at</dt>
                  <dd className="text-fg">{formatDate(selectedTx.cancelledAt)}</dd>
                </div>
              )}
              {selectedTx.providerRef && (
                <div>
                  <dt className="text-caption text-muted-fg">Provider Ref</dt>
                  <dd className="break-all font-mono text-caption text-fg">
                    {selectedTx.providerRef}
                  </dd>
                </div>
              )}
              {selectedTx.productName && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-fg">Product</dt>
                  <dd className="text-fg">{selectedTx.productName}</dd>
                </div>
              )}
              {selectedTx.message && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-fg">Message</dt>
                  <dd className="text-fg">“{selectedTx.message}”</dd>
                </div>
              )}
              {selectedTx.retriedRef && (
                <div className="col-span-2">
                  <dt className="text-caption text-muted-fg">Retried as</dt>
                  <dd className="font-mono text-caption text-fg">{selectedTx.retriedRef}</dd>
                </div>
              )}
              {sanitizeUrl(selectedTx.redirectUrl) && (
                <div className="col-span-2">
                  <a
                    href={sanitizeUrl(selectedTx.redirectUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand-strong hover:underline"
                  >
                    Open checkout URL <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              )}
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
