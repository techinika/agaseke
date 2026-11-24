import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db/firebaseAdmin", () => ({
  adminDb: {
    collection: vi.fn(),
    getAll: vi.fn(),
    batch: vi.fn(),
  },
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/authMiddleware", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

import {
  BACKFILL_COLLECTIONS,
  planCollectionCurrencyBackfill,
} from "@/lib/admin/moneyMaintenance";
import { GET, POST } from "@/app/api/admin/money/scripts/route";

describe("planCollectionCurrencyBackfill", () => {
  it("never overwrites documents that already have USD or any valid currency", () => {
    const plan = planCollectionCurrencyBackfill(
      "transactions",
      [
        {
          id: "tx-usd-pre",
          currency: "USD",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
        {
          id: "tx-eur-lowercase",
          currency: "eur",
          createdAt: "2026-02-01T10:00:00.000Z",
        },
        {
          id: "tx-missing-pre",
          createdAt: "2026-10-15T12:00:00.000Z",
        },
      ],
      new Map(),
    );

    expect(plan.scanned).toBe(3);
    expect(plan.alreadyStamped).toBe(2);
    expect(plan.updates).toEqual([
      {
        id: "tx-missing-pre",
        currency: "RWF",
        source: "pre_cutoff_rwf",
      },
    ]);
    expect(plan.byCurrency).toEqual({ RWF: 1 });
    expect(plan.unresolved).toEqual([]);
  });

  it("uses linked transaction currency before falling back to pre-cutoff RWF", () => {
    const txMap = new Map<string, Record<string, unknown>>([
      [
        "AGS-USD-1",
        {
          currency: "USD",
          createdAt: "2026-08-10T00:00:00.000Z",
        },
      ],
      [
        "AGS-RWF-1",
        {
          currency: "RWF",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    ]);

    const plan = planCollectionCurrencyBackfill(
      "platformIncome",
      [
        {
          id: "pi-1",
          txRef: "AGS-USD-1",
          createdAt: "2026-08-10T00:00:00.000Z",
        },
        {
          id: "pi-2",
          txRef: "AGS-RWF-1",
          createdAt: "2026-12-05T00:00:00.000Z",
        },
        {
          id: "pi-3",
          createdAt: "2026-12-10T00:00:00.000Z",
        },
      ],
      txMap,
    );

    expect(plan.updates).toEqual([
      {
        id: "pi-1",
        currency: "USD",
        source: "transaction_ref",
        txRef: "AGS-USD-1",
      },
      {
        id: "pi-2",
        currency: "RWF",
        source: "transaction_ref",
        txRef: "AGS-RWF-1",
      },
    ]);
    expect(plan.byCurrency).toEqual({ USD: 1, RWF: 1 });
    expect(plan.unresolved).toEqual(["pi-3"]);
  });

  it("honors payoutCurrency on withdrawRequests and payouts without overriding valid currencies", () => {
    const plan = planCollectionCurrencyBackfill(
      "withdrawRequests",
      [
        {
          id: "wr-1",
          payoutCurrency: "USD",
          createdAt: "2026-09-10T00:00:00.000Z",
        },
        {
          id: "wr-2",
          currency: "USD",
          payoutCurrency: "RWF",
          createdAt: "2026-05-10T00:00:00.000Z",
        },
        {
          id: "wr-3",
          createdAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      new Map(),
    );

    expect(plan.alreadyStamped).toBe(1);
    expect(plan.updates).toEqual([
      {
        id: "wr-1",
        currency: "USD",
        source: "payout_currency",
      },
      {
        id: "wr-3",
        currency: "RWF",
        source: "pre_cutoff_rwf",
      },
    ]);
  });
});

describe("/api/admin/money/scripts route validation", () => {
  it("returns metadata for authorized admins", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ uid: "admin-1", email: "admin@test.com" });
    const req = new NextRequest("http://localhost:3000/api/admin/money/scripts");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.backfillCollections).toEqual([...BACKFILL_COLLECTIONS]);
    expect(data.cutoffIso).toBe("2026-12-01T00:00:00.000Z");
  });

  it("rejects unsupported script names and invalid collections", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "admin-1", email: "admin@test.com" });

    const badScriptReq = new NextRequest("http://localhost:3000/api/admin/money/scripts", {
      method: "POST",
      body: JSON.stringify({ script: "drop_all", mode: "dry-run" }),
    });
    const badScriptRes = await POST(badScriptReq);
    expect(badScriptRes.status).toBe(400);

    const badColReq = new NextRequest("http://localhost:3000/api/admin/money/scripts", {
      method: "POST",
      body: JSON.stringify({
        script: "currency_backfill",
        mode: "dry-run",
        collections: ["users", "secretKeys"],
      }),
    });
    const badColRes = await POST(badColReq);
    expect(badColRes.status).toBe(400);
  });
});
