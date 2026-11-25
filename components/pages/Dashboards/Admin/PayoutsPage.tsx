/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getCurrencySymbol } from "@/types/currency";

type ActionType = "approve" | "reject";
type PayoutTab = "pending" | "history";

function formatAmount(amount: unknown, currency: string) {
  const n = Number(amount || 0);
  return `${n.toLocaleString()} ${currency ? getCurrencySymbol(currency) : ""}`.trim();
}

function toTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.seconds === "number") return val.seconds * 1000;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function AdminPayouts() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PayoutTab>("pending");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: ActionType; req: any } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "withdrawRequests"),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        }));
        items.sort((a, b) => toTimestampMs((b as any).createdAt) - toTimestampMs((a as any).createdAt));
        setRequests(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  const historyRequests = useMemo(
    () => requests.filter((r) => r.status !== "pending"),
    [requests],
  );

  const activeList = tab === "pending" ? pendingRequests : historyRequests;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeList;
    return activeList.filter((r) => {
      const name = String(r.creatorName || "").toLowerCase();
      const handle = String(r.handle || "").toLowerCase();
      const account = String(r.accountNumber || "").toLowerCase();
      return name.includes(term) || handle.includes(term) || account.includes(term);
    });
  }, [activeList, search]);

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of pendingRequests) {
      const currency = String(r.payoutCurrency || r.currency || "UNKNOWN");
      totals[currency] = (totals[currency] || 0) + Number(r.amount || 0);
    }
    return totals;
  }, [pendingRequests]);

  const handleAction = async () => {
    if (!confirm) return;
    const { action, req } = confirm;
    if (!auth.currentUser) {
      toast.error("You must be signed in to review withdrawals");
      return;
    }

    setProcessingId(req.id);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/payouts/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: req.id,
          action,
          method: req.method,
          accountNumber: req.accountNumber,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as any;
      if (!response.ok) throw new Error(payload.error || "Withdrawal action failed");

      if (action === "approve") {
        try {
          await sendCommsEmail("payout_processed", {
            creatorEmail: payload.creatorEmail || req.creatorEmail || "",
            creatorName: String(payload.creatorName || req.creatorName || ""),
            amount: Number(payload.amount ?? req.amount ?? 0),
            currency: String(payload.currency || req.payoutCurrency || req.currency || ""),
            method: String(payload.method || req.method || "MoMo"),
            accountNumber: String(payload.accountNumber || req.accountNumber || ""),
          });
        } catch {
          // request state already updated server-side
        }
      }

      toast.success(action === "approve" ? "Withdrawal approved" : "Withdrawal rejected");
      setConfirm(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Payout Management</h1>
            <p className="text-muted-foreground font-medium">
              Review multi-currency withdrawal requests (atomic settlement via admin API).
            </p>
          </div>
          <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Liability</p>
              <div className="space-y-0.5 tabular-nums">
                {Object.keys(totalsByCurrency).length === 0 ? (
                  <p className="text-lg font-black text-foreground">0</p>
                ) : (
                  Object.entries(totalsByCurrency).map(([currency, total]) => (
                    <p key={currency} className="text-lg font-black text-foreground">
                      {total.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{getCurrencySymbol(currency) || currency}</span>
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex border-b border-border gap-6">
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={`min-h-11 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === "pending"
                  ? "border-orange-600 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`min-h-11 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === "history"
                  ? "border-orange-600 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              History ({historyRequests.length})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search creator, handle, or account..."
              className="w-full min-h-11 bg-card border border-border py-2.5 pl-12 pr-4 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-medium">Loading withdrawal requests...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="bg-muted w-16 h-16 rounded-lg flex items-center justify-center mx-auto text-muted-foreground">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-muted-foreground font-medium">
                {tab === "pending" ? "No pending withdrawal requests." : "No processed withdrawals yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-border md:hidden">
                {filtered.map((req) => {
                  const payoutCurrency = String(req.payoutCurrency || req.currency || "");
                  const isProcessing = processingId === req.id;
                  const reqStatus = String(req.status || "pending");
                  const reviewedAtMs = toTimestampMs(req.reviewedAt || req.updatedAt);
                  return (
                    <div key={req.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">
                            {req.creatorName || "Creator"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground font-medium">
                            @{req.handle || req.creatorId || "unknown"}
                          </p>
                        </div>
                        <p className="shrink-0 font-black text-foreground tabular-nums">
                          {formatAmount(req.amount, payoutCurrency)}
                        </p>
                      </div>

                      {Array.isArray(req.sourceDebits) && req.sourceDebits.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Sources:{" "}
                          {req.sourceDebits
                            .map((s: any) => {
                              const src = `${Number(s.amountMajor || 0).toLocaleString()} ${s.currency || ""}`.trim();
                              if (!s.currency || s.currency === payoutCurrency) return src;
                              return `${src} → ${Number(s.payoutAmountMajor || 0).toLocaleString()} ${payoutCurrency}`;
                            })
                            .join(", ")}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-medium text-foreground">
                            {req.method || "—"} {req.rail ? `• ${String(req.rail).replace("_", " ")}` : ""}
                          </span>
                          <span className="ml-2 text-muted-foreground font-mono">
                            {req.accountNumber || "—"}
                          </span>
                        </div>
                        {tab !== "pending" && (
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                reqStatus === "completed" || reqStatus === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {reqStatus === "completed" || reqStatus === "approved" ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {reqStatus}
                            </span>
                            {reviewedAtMs > 0 && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {new Date(reviewedAtMs).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {tab === "pending" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setConfirm({ action: "approve", req })}
                            disabled={isProcessing}
                            className="flex-1 min-h-11 bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <ArrowUpRight size={14} /> Approve
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ action: "reject", req })}
                            disabled={isProcessing}
                            className="flex-1 min-h-11 px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Creator</th>
                      <th className="whitespace-nowrap px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payout</th>
                      <th className="px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destination</th>
                      <th className="whitespace-nowrap px-4 lg:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                        {tab === "pending" ? "Actions" : "Status"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((req) => {
                      const payoutCurrency = String(req.payoutCurrency || req.currency || "");
                      const isProcessing = processingId === req.id;
                      const reqStatus = String(req.status || "pending");
                      const reviewedAtMs = toTimestampMs(req.reviewedAt || req.updatedAt);
                      return (
                        <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 lg:px-6 py-5">
                            <p className="font-bold text-foreground">{req.creatorName || "Creator"}</p>
                            <p className="text-xs text-muted-foreground font-medium">@{req.handle || req.creatorId || "unknown"}</p>
                            {reqStatus === "pending" && (
                              <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider w-fit">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-5 tabular-nums">
                            <p className="whitespace-nowrap font-black text-foreground">{formatAmount(req.amount, payoutCurrency)}</p>
                            {Array.isArray(req.sourceDebits) && req.sourceDebits.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Sources: {req.sourceDebits.map((s: any) => {
                                  const src = `${Number(s.amountMajor || 0).toLocaleString()} ${s.currency || ""}`.trim();
                                  if (!s.currency || s.currency === payoutCurrency) return src;
                                  return `${src} → ${Number(s.payoutAmountMajor || 0).toLocaleString()} ${payoutCurrency}`;
                                }).join(", ")}
                              </p>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-5">
                            <p className="text-sm font-medium text-foreground">{req.method || "—"} {req.rail ? `• ${String(req.rail).replace("_", " ")}` : ""}</p>
                            <p className="text-xs text-muted-foreground font-mono">{req.accountNumber || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 lg:px-6 py-5 text-right">
                            {tab === "pending" ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setConfirm({ action: "approve", req })}
                                  disabled={isProcessing}
                                  className="min-h-11 bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><ArrowUpRight size={14} /> Approve</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirm({ action: "reject", req })}
                                  disabled={isProcessing}
                                  className="min-h-11 px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-end gap-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                    reqStatus === "completed" || reqStatus === "approved"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {reqStatus === "completed" || reqStatus === "approved" ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  {reqStatus}
                                </span>
                                {reviewedAtMs > 0 && (
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {new Date(reviewedAtMs).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg text-muted-foreground">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-xs font-medium">
            Approvals/rejections go through the server withdrawal API (idempotent, ledger-aware, multi-currency). Ensure the external transfer is completed before approving.
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        title={confirm?.action === "approve" ? "Approve withdrawal?" : "Reject withdrawal?"}
        message={
          confirm
            ? `${confirm.action === "approve" ? "Approve" : "Reject"} withdrawal of ${formatAmount(confirm.req.amount, String(confirm.req.payoutCurrency || confirm.req.currency || ""))} for ${confirm.req.creatorName || "this creator"}?`
            : ""
        }
        confirmText={confirm?.action === "approve" ? "Approve" : "Reject"}
        loading={processingId !== null}
        variant={confirm?.action === "approve" ? "warning" : "danger"}
      />
    </div>
  );
}
