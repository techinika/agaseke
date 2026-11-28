"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  HelpCircle,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { auth } from "@/db/firebase";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type {
  WorkerDiagnosticsReport,
  WorkerFirestoreStatus,
  WorkerHealthResult,
} from "@/lib/admin/workerDiagnostics";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  WorkerFirestoreStatus,
  {
    label: string;
    tone: BadgeTone;
  }
> = {
  connected: { label: "Connected", tone: "success" },
  failing: { label: "Firestore failing", tone: "danger" },
  unreachable: { label: "Worker unreachable", tone: "danger" },
  unverified: { label: "Probe not deployed", tone: "warning" },
};

function StatusIcon({ status }: { status: WorkerFirestoreStatus }) {
  if (status === "connected") {
    return <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />;
  }
  if (status === "unverified") {
    return <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" />;
  }
  return <XCircle className="size-3.5 shrink-0" aria-hidden="true" />;
}

function formatHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export interface WorkerFirestoreDiagnosticsPanelProps {
  refreshSignal?: number;
}

export function WorkerFirestoreDiagnosticsPanel({
  refreshSignal = 0,
}: WorkerFirestoreDiagnosticsPanelProps) {
  const [report, setReport] = useState<WorkerDiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showDbLogs, setShowDbLogs] = useState(false);

  const runDiagnostics = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    }
    setRequestError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setRequestError("Admin session required to run worker diagnostics.");
        return;
      }

      const res = await fetch("/api/admin/workers/health", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = (await res.json().catch(() => null)) as
        | (WorkerDiagnosticsReport & { error?: string })
        | null;

      if (!res.ok || !payload || !Array.isArray(payload.workers)) {
        setRequestError(payload?.error || `Diagnostics failed (HTTP ${res.status})`);
        return;
      }

      setReport(payload);
    } catch (err) {
      setRequestError(
        err instanceof Error ? err.message : "Unable to reach worker diagnostics endpoint.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void runDiagnostics(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runDiagnostics, refreshSignal]);

  const failingWorkers: WorkerHealthResult[] = report
    ? report.workers.filter(
        (w) => w.firestoreStatus === "failing" || w.firestoreStatus === "unreachable",
      )
    : [];
  const unverifiedWorkers: WorkerHealthResult[] = report
    ? report.workers.filter((w) => w.firestoreStatus === "unverified")
    : [];

  return (
    <section
      aria-labelledby="worker-firestore-diagnostics-heading"
      className="mb-8 rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Server className="size-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <h2
              id="worker-firestore-diagnostics-heading"
              className="text-body font-bold text-fg"
            >
              Cloudflare Workers &amp; Firestore diagnostics
            </h2>
          </div>
          <p className="mt-1 text-caption text-muted-fg">
            Live database connectivity across all 8 platform workers
            {report?.checkedAt
              ? ` · Last checked ${new Date(report.checkedAt).toLocaleTimeString()}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <div className="flex flex-wrap items-center gap-1.5 text-caption">
              <Badge tone="success">
                {report.summary.connected}/{report.summary.total} connected
              </Badge>
              {failingWorkers.length > 0 && (
                <Badge tone="danger">{failingWorkers.length} failing</Badge>
              )}
              {unverifiedWorkers.length > 0 && (
                <Badge tone="warning">{unverifiedWorkers.length} unverified</Badge>
              )}
            </div>
          )}
          <Button
            size="sm"
            variant="secondary"
            loading={refreshing}
            onClick={() => void runDiagnostics(true)}
            leadingIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
          >
            Run checks
          </Button>
        </div>
      </div>

      {loading && !report ? (
        <div className="py-8 text-center text-label text-muted-fg">
          Checking worker connections to Firestore…
        </div>
      ) : requestError && !report ? (
        <div className="rounded-control border border-line bg-danger-bg p-4 text-label text-danger">
          <p className="font-semibold">Diagnostics could not complete</p>
          <p className="mt-1 text-caption">{requestError}</p>
        </div>
      ) : report ? (
        <div className="space-y-4">
          {requestError && (
            <div className="rounded-control border border-line bg-warning-bg px-4 py-3 text-caption text-warning">
              Last refresh encountered an error: {requestError}
            </div>
          )}

          {failingWorkers.length > 0 ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-control border border-line bg-danger-bg px-4 py-3.5 text-danger"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-label font-bold">
                  {failingWorkers.length === 1
                    ? `${failingWorkers[0].name} worker is failing to communicate with Firestore`
                    : `${failingWorkers.length} workers are failing to communicate with Firestore`}
                </p>
                <p className="mt-0.5 text-caption">
                  Failing: {failingWorkers.map((w) => w.name).join(", ")}. Review the error details
                  below or check worker environment variables and Firebase credentials.
                </p>
              </div>
            </div>
          ) : unverifiedWorkers.length > 0 ? (
            <div className="flex items-start gap-3 rounded-control border border-line bg-warning-bg px-4 py-3.5 text-warning">
              <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-label font-bold">
                  {unverifiedWorkers.length} worker{unverifiedWorkers.length === 1 ? "" : "s"}{" "}
                  need redeployment for live Firestore checks
                </p>
                <p className="mt-0.5 text-caption">
                  Unverified: {unverifiedWorkers.map((w) => w.name).join(", ")}. Deploy the
                  updated worker code so `/health?check=db` reports live database status.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-control border border-line bg-success-bg px-4 py-3 text-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <p className="text-label font-semibold">
                All {report.summary.total} workers are communicating normally with Firestore.
              </p>
            </div>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {report.workers.map((worker) => {
              const meta = STATUS_META[worker.firestoreStatus];
              return (
                <div
                  key={worker.id}
                  className={cn(
                    "rounded-control border border-line bg-canvas p-4",
                    (worker.firestoreStatus === "failing" ||
                      worker.firestoreStatus === "unreachable") &&
                      "border-danger/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-fg">{worker.name}</p>
                      <p className="truncate text-caption text-muted-fg">
                        {formatHost(worker.url)}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>
                      <StatusIcon status={worker.firestoreStatus} />
                      <span>{meta.label}</span>
                    </Badge>
                  </div>
                  <p className="mt-2 text-caption text-muted-fg">{worker.role}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-caption tabular-nums text-muted-fg">
                    <span>
                      Latency: {worker.latencyMs !== null ? `${worker.latencyMs}ms` : "—"}
                    </span>
                    <span>
                      HTTP: {worker.httpStatus !== null ? worker.httpStatus : "No response"}
                    </span>
                  </div>
                  {worker.error && (
                    <p className="mt-2 rounded-control bg-surface-raised px-2.5 py-2 text-caption text-fg">
                      {worker.error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-label">
              <thead>
                <tr className="border-b border-line text-caption font-semibold text-muted-fg">
                  <th className="py-2.5 pr-4">Worker</th>
                  <th className="py-2.5 pr-4">Purpose</th>
                  <th className="py-2.5 pr-4">Firestore</th>
                  <th className="py-2.5 pr-4 text-right">Latency</th>
                  <th className="py-2.5">Diagnostic detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.workers.map((worker) => {
                  const meta = STATUS_META[worker.firestoreStatus];
                  const isError =
                    worker.firestoreStatus === "failing" ||
                    worker.firestoreStatus === "unreachable";
                  return (
                    <tr
                      key={worker.id}
                      className={cn(
                        "align-top",
                        isError ? "bg-danger-bg/30" : "hover:bg-surface-raised/40",
                      )}
                    >
                      <td className="py-3 pr-4">
                        <p className="font-bold text-fg">{worker.name}</p>
                        <p className="text-caption text-muted-fg">{formatHost(worker.url)}</p>
                      </td>
                      <td className="py-3 pr-4 text-caption text-muted-fg">{worker.role}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={meta.tone}>
                          <StatusIcon status={worker.firestoreStatus} />
                          <span>{meta.label}</span>
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right text-caption tabular-nums text-fg">
                        {worker.latencyMs !== null ? `${worker.latencyMs}ms` : "—"}
                      </td>
                      <td className="max-w-md py-3 text-caption">
                        {worker.error ? (
                          <span className={isError ? "font-medium text-danger" : "text-muted-fg"}>
                            {worker.error}
                          </span>
                        ) : (
                          <span className="text-muted-fg">
                            Firestore REST read OK (HTTP {worker.firestoreHttpStatus ?? 200})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recent logged DB failures from activityLogs */}
          {report.recentDbFailures.length > 0 && (
            <div className="rounded-control border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowDbLogs((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-left text-caption font-semibold text-fg hover:text-brand-strong"
                >
                  <Database className="size-3.5 text-danger" aria-hidden="true" />
                  <span>
                    Recent logged Firestore operation failures ({report.recentDbFailures.length})
                  </span>
                  {showDbLogs ? (
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  )}
                </button>
                <Link
                  href="/admin/logs"
                  className="text-caption font-semibold text-brand-strong hover:underline"
                >
                  Open activity logs
                </Link>
              </div>

              {showDbLogs && (
                <div className="mt-3 divide-y divide-line border-t border-line pt-2">
                  {report.recentDbFailures.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-1 py-2 text-caption sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-fg">
                          {entry.method} {entry.path}
                          {entry.status ? ` (HTTP ${entry.status})` : ""}
                        </p>
                        <p className="truncate text-danger">{entry.error}</p>
                      </div>
                      <span className="shrink-0 tabular-nums text-muted-fg">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString()
                          : "Unknown time"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
