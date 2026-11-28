import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredWorkers,
  runWorkerDiagnostics,
  type WorkerDiagnosticsReport,
} from "@/lib/admin/workerDiagnostics";

describe("worker diagnostics helper & admin API route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("classifies connected, failing Firestore, unverified legacy, and unreachable workers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect((init?.headers as Record<string, string>)["X-Internal-Auth"]).toBe("int-sec");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer admin-tok");

      if (url.startsWith("https://payments.api.agaseke.me")) {
        return new Response(
          JSON.stringify({
            status: "degraded",
            service: "agaseke-payments",
            firestore: {
              ok: false,
              latencyMs: 120,
              httpStatus: 403,
              stage: "firestore",
              error: "Firestore HTTP 403: Missing or insufficient permissions",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://support.api.agaseke.me")) {
        return new Response(
          JSON.stringify({ status: "ok" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://comms.api.agaseke.me")) {
        return new Response(
          JSON.stringify({ error: "Method not allowed. Use POST." }),
          { status: 405, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://store.api.agaseke.me")) {
        throw new Error("Connection refused");
      }

      return new Response(
        JSON.stringify({
          status: "ok",
          firestore: { ok: true, latencyMs: 45, httpStatus: 200 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const report = await runWorkerDiagnostics({
      internalAuthSecret: "int-sec",
      authorizationHeader: "Bearer admin-tok",
      fetchImpl: fetchMock,
    });

    expect(report.summary.total).toBe(8);
    expect(report.summary.connected).toBe(4);
    expect(report.summary.failing).toBe(1);
    expect(report.summary.unreachable).toBe(1);
    expect(report.summary.unverified).toBe(2);
    expect(report.summary.allConnected).toBe(false);

    const byId = Object.fromEntries(report.workers.map((w) => [w.id, w]));
    expect(byId.payments.firestoreStatus).toBe("failing");
    expect(byId.payments.error).toContain("403");
    expect(byId.store.firestoreStatus).toBe("unreachable");
    expect(byId.store.error).toContain("Connection refused");
    expect(byId.support.firestoreStatus).toBe("unverified");
    expect(byId.comms.firestoreStatus).toBe("unverified");
    expect(byId.bookings.firestoreStatus).toBe("connected");
  });

  it("reads configured worker URL overrides cleanly", () => {
    const workers = getConfiguredWorkers({
      NEXT_PUBLIC_PAYMENTS_WORKER_URL: "https://custom-pay.example.com/",
    });
    expect(workers.find((w) => w.id === "payments")?.url).toBe("https://custom-pay.example.com");
    expect(workers.find((w) => w.id === "upload")?.url).toBe("https://upload.api.agaseke.me");
  });

  it("enforces admin authentication on GET /api/admin/workers/health", async () => {
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAdmin: vi.fn(async () =>
        NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      ),
    }));
    vi.doMock("@/db/firebaseAdmin", () => ({
      adminDb: { collection: vi.fn() },
    }));

    const { GET } = await import("@/app/api/admin/workers/health/route");
    const res = await GET(new NextRequest("https://agaseke.me/api/admin/workers/health"));
    expect(res.status).toBe(403);
  });

  it("returns worker diagnostics + recent DB failure logs for authenticated admins", async () => {
    process.env.INTERNAL_AUTH_SECRET = "super-secret-value";

    vi.doMock("@/lib/authMiddleware", () => ({
      requireAdmin: vi.fn(async () => ({
        uid: "admin-1",
        email: "admin@agaseke.me",
        isAdmin: true,
      })),
    }));
    vi.doMock("@/db/firebaseAdmin", () => ({
      adminDb: {
        collection: () => ({
          orderBy: () => ({
            limit: () => ({
              get: async () => ({
                docs: [
                  {
                    id: "log-1",
                    data: () => ({
                      category: "db",
                      level: "error",
                      method: "POST",
                      path: "transactions",
                      status: 403,
                      error: "Missing or insufficient permissions",
                      durationMs: 90,
                      createdAt: new Date("2026-11-28T10:00:00.000Z"),
                    }),
                  },
                  {
                    id: "log-2",
                    data: () => ({
                      category: "payment",
                      level: "error",
                      message: "Non-db log ignored",
                    }),
                  },
                ],
              }),
            }),
          }),
        }),
      },
    }));

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "ok",
          firestore: { ok: true, latencyMs: 25, httpStatus: 200 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/admin/workers/health/route");
    const res = await GET(
      new NextRequest("https://agaseke.me/api/admin/workers/health", {
        headers: { Authorization: "Bearer admin-jwt" },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as WorkerDiagnosticsReport;
    expect(body.summary.total).toBe(8);
    expect(body.summary.connected).toBe(8);
    expect(body.summary.allConnected).toBe(true);
    expect(body.recentDbFailures).toHaveLength(1);
    expect(body.recentDbFailures[0].path).toBe("transactions");
    expect(JSON.stringify(body)).not.toContain("super-secret-value");
  });
});

describe("WorkerFirestoreDiagnosticsPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("highlights workers failing to communicate with Firestore", async () => {
    const report: WorkerDiagnosticsReport = {
      checkedAt: "2026-11-28T12:00:00.000Z",
      summary: {
        total: 8,
        connected: 6,
        failing: 1,
        unreachable: 1,
        unverified: 0,
        allConnected: false,
      },
      workers: [
        {
          id: "payments",
          name: "Payments",
          service: "agaseke-payments",
          url: "https://payments.api.agaseke.me",
          role: "Checkouts, webhooks, retries & FX rates",
          workerReachable: true,
          firestoreStatus: "failing",
          httpStatus: 503,
          firestoreHttpStatus: 403,
          stage: "oauth",
          latencyMs: 140,
          error: "OAuth 400: Invalid JWT Signature",
          checkedAt: "2026-11-28T12:00:00.000Z",
        },
        {
          id: "support",
          name: "Support",
          service: "agaseke-support",
          url: "https://support.api.agaseke.me",
          role: "Tips, gifts & creator earnings callbacks",
          workerReachable: false,
          firestoreStatus: "unreachable",
          httpStatus: null,
          firestoreHttpStatus: null,
          stage: "network",
          latencyMs: 8000,
          error: "Timed out after 8000ms",
          checkedAt: "2026-11-28T12:00:00.000Z",
        },
        {
          id: "store",
          name: "Store",
          service: "agaseke-store",
          url: "https://store.api.agaseke.me",
          role: "Store orders, fulfillment & digital downloads",
          workerReachable: true,
          firestoreStatus: "connected",
          httpStatus: 200,
          firestoreHttpStatus: 200,
          stage: null,
          latencyMs: 52,
          error: null,
          checkedAt: "2026-11-28T12:00:00.000Z",
        },
      ],
      recentDbFailures: [],
    };

    vi.doMock("@/db/firebase", () => ({
      auth: {
        currentUser: {
          getIdToken: vi.fn(async () => "admin-id-token"),
        },
      },
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(report), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { WorkerFirestoreDiagnosticsPanel } = await import(
      "@/components/pages/Dashboards/Admin/WorkerFirestoreDiagnosticsPanel"
    );
    render(<WorkerFirestoreDiagnosticsPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("2 workers are failing to communicate with Firestore"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Failing: Payments, Support\./)).toBeInTheDocument();
    expect(screen.getAllByText("OAuth 400: Invalid JWT Signature").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Timed out after 8000ms").length).toBeGreaterThan(0);
  });
});
