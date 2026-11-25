"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Database,
  Play,
  RefreshCw,
  Scale,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/db/firebase";
import { Badge, Button, Card, ConfirmModal, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

const DEFAULT_COLLECTIONS = [
  "platformIncome",
  "creatorIncome",
  "transactions",
  "supportedCreators",
  "sales",
  "storeOrders",
  "storeProducts",
  "bookingRequests",
  "creatorGatherings",
  "ticketSales",
  "gatheringsAttendance",
  "payouts",
  "withdrawRequests",
];

const DEFAULT_CUTOFF_ISO = "2026-12-01T00:00:00.000Z";

type CurrencyBackfillCollectionReport = {
  collection: string;
  scanned: number;
  alreadyStamped: number;
  updatesPlanned: number;
  written: number;
  unresolved: string[];
  byCurrency: Record<string, number>;
  sampleUpdates: Array<{
    id: string;
    currency: string;
    source: string;
    txRef?: string;
  }>;
};

type CurrencyBackfillResult = {
  script: "currency_backfill";
  applied: boolean;
  cutoffIso: string;
  totals: {
    scanned: number;
    alreadyStamped: number;
    updatesPlanned: number;
    written: number;
    unresolved: number;
  };
  collections: CurrencyBackfillCollectionReport[];
};

type LedgerBackfillResult = {
  script: "ledger_backfill";
  applied: boolean;
  scanned: number;
  plannedCreators: number;
  plannedEntries: number;
  writtenCreators: number;
  writtenEntries: number;
  skippedExisting: number;
  skippedNoBalance: number;
  totalsMinorByCurrency: Record<string, number>;
  sampleCreators: Array<{
    handle: string;
    currencies: Record<string, number>;
  }>;
};

type LedgerReconcileResult = {
  script: "ledger_reconcile";
  ok: boolean;
  balancesScanned: number;
  balancesChecked: number;
  mismatchedCreators: number;
  missingLedgerEntries: number;
  missingLedgerHandles: string[];
  mismatchDetails: Array<{
    handle: string;
    currency: string;
    available: [number, number];
    lifetimeEarned: [number, number];
    pendingWithdrawals: [number, number];
    lifetimeWithdrawn: [number, number];
  }>;
};

type EnablementCheckResult = {
  script: "enablement_check";
  registeredCurrencyCount: number;
  providerCount: number;
  fxStatus: "fresh" | "stale" | "missing" | "invalid";
  fxRateCount: number;
  currencies: Array<{
    code: string;
    name: string;
    minorUnit: number;
    countries: string[];
    rails: string[];
    policyConfigured: boolean;
    policyEnabled: boolean | null;
    payoutThreshold: number | null;
    hasFxRate: boolean;
  }>;
};

type PendingConfirmAction =
  | { script: "currency_backfill"; title: string; message: string }
  | { script: "ledger_backfill"; title: string; message: string }
  | null;

export default function AdminMaintenanceTab() {
  const [cutoffIso, setCutoffIso] = useState(DEFAULT_CUTOFF_ISO);
  const [availableCollections, setAvailableCollections] =
    useState<string[]>(DEFAULT_COLLECTIONS);
  const [selectedCollections, setSelectedCollections] =
    useState<string[]>(DEFAULT_COLLECTIONS);
  const [backfillLimit, setBackfillLimit] = useState("500");

  const [handleFilter, setHandleFilter] = useState("");
  const [ledgerLimit, setLedgerLimit] = useState("200");

  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [runningScript, setRunningScript] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirmAction>(null);

  const [currencyResult, setCurrencyResult] = useState<CurrencyBackfillResult | null>(
    null,
  );
  const [ledgerBackfillResult, setLedgerBackfillResult] =
    useState<LedgerBackfillResult | null>(null);
  const [reconcileResult, setReconcileResult] = useState<LedgerReconcileResult | null>(
    null,
  );
  const [enablementResult, setEnablementResult] =
    useState<EnablementCheckResult | null>(null);
  const [fxRefreshing, setFxRefreshing] = useState(false);

  const getToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Admin authentication required");
    }
    return token;
  }, []);

  const applyMetadataResponse = useCallback(
    (data: Record<string, unknown>) => {
      setMetadataError(null);
      if (typeof data.cutoffIso === "string" && data.cutoffIso) {
        setCutoffIso(data.cutoffIso);
      }
      if (
        Array.isArray(data.backfillCollections) &&
        data.backfillCollections.length > 0
      ) {
        const cols = data.backfillCollections.filter(
          (c): c is string => typeof c === "string",
        );
        setAvailableCollections(cols);
        setSelectedCollections((prev) => (prev.length > 0 ? prev : cols));
      }
    },
    [],
  );

  const loadMetadata = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/money/scripts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load script metadata");
      }
      const data = (await res.json()) as Record<string, unknown>;
      applyMetadataResponse(data);
    } catch (err) {
      setMetadataError(
        err instanceof Error ? err.message : "Could not verify admin session",
      );
    }
  }, [applyMetadataResponse, getToken]);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) =>
        fetch("/api/admin/money/scripts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to load script metadata");
        }
        return (await res.json()) as Record<string, unknown>;
      })
      .then((data) => {
        if (!cancelled) applyMetadataResponse(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setMetadataError(
            err instanceof Error ? err.message : "Could not verify admin session",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyMetadataResponse, getToken]);

  const executeScript = async (
    script:
      | "currency_backfill"
      | "ledger_backfill"
      | "ledger_reconcile"
      | "enablement_check",
    mode: "dry-run" | "apply",
  ) => {
    setRunningScript(`${script}:${mode}`);
    try {
      const token = await getToken();
      const payload: Record<string, unknown> = { script, mode };

      if (script === "currency_backfill") {
        if (selectedCollections.length === 0) {
          toast.error("Select at least one collection to scan");
          return;
        }
        payload.collections = selectedCollections;
        payload.limit = Number(backfillLimit) || 500;
      } else if (script === "ledger_backfill" || script === "ledger_reconcile") {
        payload.limit = Number(ledgerLimit) || 200;
        const cleanHandle = handleFilter.trim();
        if (cleanHandle) {
          payload.handle = cleanHandle;
        }
      }

      const res = await fetch("/api/admin/money/scripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Script execution failed");
      }

      if (script === "currency_backfill") {
        setCurrencyResult(data.result as CurrencyBackfillResult);
        toast.success(
          mode === "apply"
            ? `Currency backfill applied (${data.result.totals?.written ?? 0} docs updated)`
            : `Currency dry run complete (${data.result.totals?.updatesPlanned ?? 0} updates planned)`,
        );
      } else if (script === "ledger_backfill") {
        setLedgerBackfillResult(data.result as LedgerBackfillResult);
        toast.success(
          mode === "apply"
            ? `Ledger backfill applied (${data.result.writtenCreators ?? 0} creators initialized)`
            : `Ledger dry run complete (${data.result.plannedCreators ?? 0} creators ready)`,
        );
      } else if (script === "ledger_reconcile") {
        setReconcileResult(data.result as LedgerReconcileResult);
        toast.success(
          data.result.ok
            ? "Ledger reconciliation passed with zero mismatches"
            : "Ledger reconciliation found mismatches",
        );
      } else if (script === "enablement_check") {
        setEnablementResult(data.result as EnablementCheckResult);
        toast.success("Currency and payment rail readiness check complete");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run script");
    } finally {
      setRunningScript(null);
    }
  };

  const refreshFxFromFrankfurter = async () => {
    setFxRefreshing(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/fx/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to refresh FX rates");
      }
      toast.success(
        `Refreshed ${data.rateCount ?? 0} FX pairs from ${data.source || "frankfurter.dev"}`,
      );
      await executeScript("enablement_check", "dry-run");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to refresh FX rates",
      );
    } finally {
      setFxRefreshing(false);
    }
  };

  const toggleCollection = (name: string) => {
    setSelectedCollections((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
  };

  const formattedCutoff = cutoffIso.slice(0, 10);

  return (
    <div className="space-y-6">
      {metadataError && (
        <Card className="flex flex-col gap-3 border-warning p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="text-label font-semibold text-fg">
                Admin script endpoint check warning
              </p>
              <p className="text-caption text-muted-fg">{metadataError}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadMetadata()}
            leadingIcon={<RefreshCw className="size-4" />}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* 1. Historical Currency Backfill */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-brand-strong" />
              <h2 className="text-subhead font-bold text-fg">
                Historical Currency Backfill
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-body text-muted-fg">
              Stamps missing currency fields across financial collections using linked
              transaction refs or <span className="font-semibold text-fg">RWF</span> for
              records before <span className="font-semibold text-fg">{formattedCutoff}</span>.
              Existing explicit currencies (such as <span className="font-semibold text-fg">USD</span>) are
              never modified.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={runningScript === "currency_backfill:dry-run"}
              disabled={runningScript !== null || selectedCollections.length === 0}
              onClick={() => void executeScript("currency_backfill", "dry-run")}
              leadingIcon={<Play className="size-4" />}
            >
              Run Dry Run
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={runningScript === "currency_backfill:apply"}
              disabled={runningScript !== null || selectedCollections.length === 0}
              onClick={() =>
                setConfirmAction({
                  script: "currency_backfill",
                  title: "Apply Historical Currency Backfill?",
                  message: `Only documents missing a valid currency (pre-${formattedCutoff} or linked by transaction ref) will be updated across ${selectedCollections.length} collection(s). Existing currencies like USD will never be changed.`,
                })
              }
            >
              Apply Backfill
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-label font-semibold text-fg">
                Target Collections ({selectedCollections.length}/{availableCollections.length})
              </span>
              <div className="flex items-center gap-3 text-caption font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedCollections([...availableCollections])}
                  className="text-brand-strong hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCollections([])}
                  className="text-muted-fg hover:text-fg hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCollections.map((name) => {
                const selected = selectedCollections.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCollection(name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-caption font-semibold transition-colors",
                      selected
                        ? "border-brand-strong bg-brand-strong text-on-brand"
                        : "border-line bg-surface-raised text-muted-fg hover:text-fg",
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Input
              label="Batch Limit per Collection"
              type="number"
              min={1}
              max={2000}
              value={backfillLimit}
              onChange={(e) => setBackfillLimit(e.target.value)}
              hint="1 to 2,000 docs"
            />
          </div>
        </div>

        {currencyResult && (
          <div className="mt-6 space-y-4 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={currencyResult.applied ? "success" : "info"}>
                  {currencyResult.applied ? "Applied" : "Dry Run Preview"}
                </Badge>
                <span className="text-caption text-muted-fg">
                  Cutoff: {currencyResult.cutoffIso}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-control border border-line bg-surface-raised p-3">
                <p className="text-caption text-muted-fg">Scanned</p>
                <p className="mt-1 text-subhead font-bold tabular-nums text-fg">
                  {currencyResult.totals.scanned.toLocaleString()}
                </p>
              </div>
              <div className="rounded-control border border-line bg-surface-raised p-3">
                <p className="text-caption text-muted-fg">Already Stamped (Kept)</p>
                <p className="mt-1 text-subhead font-bold tabular-nums text-fg">
                  {currencyResult.totals.alreadyStamped.toLocaleString()}
                </p>
              </div>
              <div className="rounded-control border border-line bg-surface-raised p-3">
                <p className="text-caption text-muted-fg">
                  {currencyResult.applied ? "Written" : "Planned Updates"}
                </p>
                <p className="mt-1 text-subhead font-bold tabular-nums text-brand-strong">
                  {(currencyResult.applied
                    ? currencyResult.totals.written
                    : currencyResult.totals.updatesPlanned
                  ).toLocaleString()}
                </p>
              </div>
              <div className="rounded-control border border-line bg-surface-raised p-3">
                <p className="text-caption text-muted-fg">Unresolved (Post-Cutoff)</p>
                <p className="mt-1 text-subhead font-bold tabular-nums text-fg">
                  {currencyResult.totals.unresolved.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full text-left text-caption">
                <thead className="border-b border-line bg-surface-raised text-muted-fg">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Collection</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Scanned</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Kept</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Planned</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Written</th>
                    <th className="px-3 py-2.5 font-semibold">Target Currencies</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Unresolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {currencyResult.collections.map((row) => {
                    const currencySummary = Object.entries(row.byCurrency)
                      .map(([cur, count]) => `${cur}: ${count}`)
                      .join(", ");
                    return (
                      <tr key={row.collection} className="hover:bg-surface-raised/60">
                        <td className="px-3 py-2.5 font-semibold text-fg">
                          {row.collection}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-fg">
                          {row.scanned}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-fg">
                          {row.alreadyStamped}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">
                          {row.updatesPlanned}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-success">
                          {row.written}
                        </td>
                        <td className="px-3 py-2.5 text-muted-fg">
                          {currencySummary || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-fg">
                          {row.unresolved.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {currencyResult.collections.some((c) => c.sampleUpdates.length > 0) && (
              <div className="rounded-control border border-line bg-surface-raised p-4">
                <p className="text-label font-semibold text-fg">
                  Sample Planned / Applied Records
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {currencyResult.collections
                    .flatMap((c) =>
                      c.sampleUpdates.slice(0, 4).map((u) => ({
                        collection: c.collection,
                        ...u,
                      })),
                    )
                    .slice(0, 12)
                    .map((item) => (
                      <div
                        key={`${item.collection}:${item.id}`}
                        className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-1.5 text-caption"
                      >
                        <span className="truncate font-mono text-fg">
                          {item.collection}/{item.id}
                        </span>
                        <span className="shrink-0 font-semibold text-brand-strong">
                          {item.currency} ({item.source})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 2. Ledger Opening Balance Backfill & Reconciliation */}
      <Card className="p-6">
        <div className="border-b border-line pb-5">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-brand-strong" />
            <h2 className="text-subhead font-bold text-fg">
              Creator Ledger Backfill &amp; Reconciliation
            </h2>
          </div>
          <p className="mt-1 text-body text-muted-fg">
            Initialize missing <span className="font-semibold text-fg">creatorBalances</span>{" "}
            and opening <span className="font-semibold text-fg">ledgerEntries</span>, or
            verify every ledger account matches creator available, pending, and lifetime
            totals.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Optional Creator Handle Filter"
            placeholder="Leave blank to scan all creators"
            value={handleFilter}
            onChange={(e) => setHandleFilter(e.target.value)}
          />
          <Input
            label="Batch Limit"
            type="number"
            min={1}
            max={2000}
            value={ledgerLimit}
            onChange={(e) => setLedgerLimit(e.target.value)}
            hint="1 to 2,000 creators"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-control border border-line bg-surface-raised p-4">
            <h3 className="text-label font-bold text-fg">
              Ledger Opening Balance Backfill
            </h3>
            <p className="mt-1 text-caption text-muted-fg">
              Skips any creator who already has a ledger balance or zero pending payout.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={runningScript === "ledger_backfill:dry-run"}
                disabled={runningScript !== null}
                onClick={() => void executeScript("ledger_backfill", "dry-run")}
              >
                Dry Run Backfill
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={runningScript === "ledger_backfill:apply"}
                disabled={runningScript !== null}
                onClick={() =>
                  setConfirmAction({
                    script: "ledger_backfill",
                    title: "Apply Ledger Opening Balance Backfill?",
                    message:
                      "This creates opening ledgerEntries and creatorBalances records for creators without existing ledger accounts.",
                  })
                }
              >
                Apply Ledger Backfill
              </Button>
            </div>

            {ledgerBackfillResult && (
              <div className="mt-4 space-y-2 border-t border-line pt-3 text-caption">
                <div className="flex items-center justify-between">
                  <Badge tone={ledgerBackfillResult.applied ? "success" : "info"}>
                    {ledgerBackfillResult.applied ? "Applied" : "Dry Run"}
                  </Badge>
                  <span className="tabular-nums text-muted-fg">
                    Scanned {ledgerBackfillResult.scanned} creators
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
                  <div>
                    Planned: <strong>{ledgerBackfillResult.plannedCreators}</strong>{" "}
                    ({ledgerBackfillResult.plannedEntries} entries)
                  </div>
                  <div>
                    Written: <strong>{ledgerBackfillResult.writtenCreators}</strong>{" "}
                    ({ledgerBackfillResult.writtenEntries} entries)
                  </div>
                  <div className="text-muted-fg">
                    Skipped existing: {ledgerBackfillResult.skippedExisting}
                  </div>
                  <div className="text-muted-fg">
                    Zero balance: {ledgerBackfillResult.skippedNoBalance}
                  </div>
                </div>
                {ledgerBackfillResult.sampleCreators.length > 0 && (
                  <div className="pt-2">
                    <p className="font-semibold text-fg">Sample Creators (minor units):</p>
                    <ul className="mt-1 space-y-1 text-muted-fg">
                      {ledgerBackfillResult.sampleCreators.slice(0, 6).map((c) => (
                        <li key={c.handle} className="truncate font-mono">
                          @{c.handle}:{" "}
                          {Object.entries(c.currencies)
                            .map(([k, v]) => `${k} ${v}`)
                            .join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-control border border-line bg-surface-raised p-4">
            <h3 className="text-label font-bold text-fg">Ledger Reconciliation Check</h3>
            <p className="mt-1 text-caption text-muted-fg">
              Read-only audit comparing creatorBalances documents against summed ledgerEntries.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={runningScript === "ledger_reconcile:dry-run"}
                disabled={runningScript !== null}
                onClick={() => void executeScript("ledger_reconcile", "dry-run")}
                leadingIcon={<Play className="size-4" />}
              >
                Run Reconciliation
              </Button>
            </div>

            {reconcileResult && (
              <div className="mt-4 space-y-2 border-t border-line pt-3 text-caption">
                <div className="flex items-center justify-between">
                  <Badge tone={reconcileResult.ok ? "success" : "danger"}>
                    {reconcileResult.ok ? "Balanced" : "Mismatch Detected"}
                  </Badge>
                  <span className="tabular-nums text-muted-fg">
                    Checked {reconcileResult.balancesChecked}/
                    {reconcileResult.balancesScanned}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
                  <div>
                    Mismatched Creators:{" "}
                    <strong>{reconcileResult.mismatchedCreators}</strong>
                  </div>
                  <div>
                    Missing Ledger Entries:{" "}
                    <strong>{reconcileResult.missingLedgerEntries}</strong>
                  </div>
                </div>
                {reconcileResult.mismatchDetails.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-control border border-line bg-surface p-2 font-mono text-caption">
                    {reconcileResult.mismatchDetails.map((m) => (
                      <div key={`${m.handle}:${m.currency}`} className="py-0.5 text-danger">
                        @{m.handle} ({m.currency}) avail {m.available[0]} vs{" "}
                        {m.available[1]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 3. Currency & Payment Rail Readiness */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand-strong" />
              <h2 className="text-subhead font-bold text-fg">
                Currency &amp; Payment Rail Readiness
              </h2>
            </div>
            <p className="mt-1 text-body text-muted-fg">
              Inspect registered currencies, configured Firestore policies, payment rail
              coverage, and live FX snapshot freshness.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={fxRefreshing}
              disabled={runningScript !== null || fxRefreshing}
              onClick={() => void refreshFxFromFrankfurter()}
              leadingIcon={<RefreshCw className="size-4" />}
            >
              Refresh FX (Frankfurter)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={runningScript === "enablement_check:dry-run"}
              disabled={runningScript !== null || fxRefreshing}
              onClick={() => void executeScript("enablement_check", "dry-run")}
              leadingIcon={<Play className="size-4" />}
            >
              Run Readiness Check
            </Button>
          </div>
        </div>

        {enablementResult && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  enablementResult.fxStatus === "fresh"
                    ? "success"
                    : enablementResult.fxStatus === "stale"
                      ? "warning"
                      : "danger"
                }
              >
                FX Snapshot: {enablementResult.fxStatus}
              </Badge>
              <Badge tone="neutral">
                {enablementResult.registeredCurrencyCount} currencies
              </Badge>
              <Badge tone="neutral">
                {enablementResult.providerCount} payment providers
              </Badge>
              <Badge tone="neutral">
                {enablementResult.fxRateCount} FX rates loaded
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full text-left text-caption">
                <thead className="border-b border-line bg-surface-raised text-muted-fg">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Currency</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Minor Unit</th>
                    <th className="px-3 py-2.5 font-semibold">Rails</th>
                    <th className="px-3 py-2.5 font-semibold">Policy</th>
                    <th className="px-3 py-2.5 font-semibold">FX Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {enablementResult.currencies.map((cur) => (
                    <tr key={cur.code} className="hover:bg-surface-raised/60">
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-fg">{cur.code}</span>{" "}
                        <span className="text-muted-fg">{cur.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-fg">
                        {cur.minorUnit}
                      </td>
                      <td className="px-3 py-2.5 text-muted-fg">
                        {cur.rails.length > 0 ? cur.rails.join(", ") : "None"}
                      </td>
                      <td className="px-3 py-2.5">
                        {!cur.policyConfigured ? (
                          <Badge tone="warning">Unconfigured</Badge>
                        ) : cur.policyEnabled ? (
                          <Badge tone="success">Enabled</Badge>
                        ) : (
                          <Badge tone="danger">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={cur.hasFxRate ? "success" : "warning"}>
                          {cur.hasFxRate ? "Covered" : "Missing"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const target = confirmAction.script;
          setConfirmAction(null);
          void executeScript(target, "apply");
        }}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        confirmText="Apply Now"
        cancelText="Cancel"
        loading={runningScript !== null}
        variant="warning"
      />
    </div>
  );
}
