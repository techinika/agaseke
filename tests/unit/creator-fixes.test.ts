import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resolveTargetPayoutAccount } from "@/lib/payouts/targetAccount";
import {
  buildPayoutOverview,
  enrichPayoutOverviewWithFx,
} from "@/lib/payouts/overview";
import { evaluateLocationUpdateCooldown } from "@/lib/creator/locationPolicy";
import { en } from "@/lib/i18n/en";

describe("Creator overview earnings label", () => {
  it("uses All-time earnings instead of Earnings this month", () => {
    expect(en.creatorHome.allTimeEarnings).toBe("All-time earnings");
    expect(en.creatorHome.earningsThisMonth).toBe("All-time earnings");
  });
});

describe("Verified payout target account resolution", () => {
  it("prioritizes verified KYC bank details over stale onboarding payoutNumber", () => {
    const target = resolveTargetPayoutAccount(
      {
        verified: true,
        payoutNumber: "0780000000",
        network: "MTN",
        payoutPreference: "momo",
      },
      {
        status: "approved",
        payoutPreference: "bank",
        accountNumber: "400123456789",
        accountName: "Jane Creator",
        bankName: "Bank of Kigali",
        swiftCode: "BKIGRWRW",
      },
    );

    expect(target).toEqual({
      accountNumber: "400123456789",
      accountName: "Jane Creator",
      bankName: "Bank of Kigali",
      payoutPreference: "bank",
      providerLabel: "Bank of Kigali",
      swiftCode: "BKIGRWRW",
      isFromVerification: true,
    });
  });

  it("uses synced verifiedAccountNumber on creator doc even when verificationRequest snapshot is not loaded", () => {
    const target = resolveTargetPayoutAccount({
      verified: true,
      payoutNumber: "0780000000",
      network: "MTN",
      verifiedAccountNumber: "10099887766",
      verifiedAccountName: "Alice Verified",
      verifiedBankName: "Equity Bank",
      verifiedPayoutPreference: "bank",
    });

    expect(target.accountNumber).toBe("10099887766");
    expect(target.accountName).toBe("Alice Verified");
    expect(target.providerLabel).toBe("Equity Bank");
    expect(target.payoutPreference).toBe("bank");
    expect(target.isFromVerification).toBe(true);
  });

  it("syncs KYC account onto creator and uses it in /api/payouts/withdraw", async () => {
    vi.resetModules();

    const creatorUpdates: Array<Record<string, unknown>> = [];
    const withdrawWrites: Array<Record<string, unknown>> = [];

    const mockCreatorDoc = {
      id: "alice",
      ref: {
        update: vi.fn((d: Record<string, unknown>) => {
          creatorUpdates.push(d);
        }),
      },
      data: () => ({
        uid: "uid-alice",
        name: "Alice Creator",
        handle: "alice",
        verified: true,
        currency: "RWF",
        payoutPreference: "momo",
        payoutNumber: "0780000000",
        network: "MTN",
        pendingPayout: 15000,
        pendingWithdrawals: {},
      }),
    };

    const mockDb = {
      runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          get: async (ref: { __type: string }) => {
            if (ref.__type === "request") return { exists: false };
            if (ref.__type === "creator") return { exists: true, data: mockCreatorDoc.data };
            if (ref.__type === "balance") {
              return { exists: true, data: () => ({ available: { RWF: 15000 } }) };
            }
            return { exists: false };
          },
          set: (ref: { __type: string }, data: Record<string, unknown>) => {
            if (ref.__type === "request") withdrawWrites.push(data);
          },
          update: vi.fn(),
        };
        await fn(tx);
      },
      collection: (name: string) => ({
        doc: (id: string) => ({
          __type:
            name === "withdrawRequests"
              ? "request"
              : name === "creatorBalances"
                ? "balance"
                : name,
          id,
        }),
        where: () => ({
          limit: () => ({
            get: async () => {
              if (name === "creators") {
                return {
                  empty: false,
                  docs: [{ ...mockCreatorDoc, ref: { __type: "creator" } }],
                };
              }
              if (name === "verificationRequests") {
                return {
                  empty: false,
                  docs: [
                    {
                      id: "verif-1",
                      data: () => ({
                        uid: "uid-alice",
                        status: "approved",
                        payoutPreference: "bank",
                        accountNumber: "400999888777",
                        accountName: "Alice KYC",
                        bankName: "I&M Bank",
                        swiftCode: "IMRWRWRW",
                        createdAt: "2026-11-20T00:00:00.000Z",
                      }),
                    },
                  ],
                };
              }
              if (name === "currencies") {
                return {
                  empty: false,
                  docs: [
                    {
                      data: () => ({
                        code: "RWF",
                        payoutThreshold: 10000,
                        payoutProvider: "manual",
                        payoutRail: "bank_transfer",
                      }),
                    },
                  ],
                };
              }
              return { empty: true, docs: [] };
            },
          }),
        }),
      }),
    };

    vi.doMock("@/db/firebaseAdmin", () => ({
      admin: {
        firestore: {
          FieldValue: {
            serverTimestamp: () => "TS",
            increment: (n: number) => n,
          },
        },
      },
      adminDb: mockDb,
    }));
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAuth: vi.fn(async () => ({
        uid: "uid-alice",
        email: "alice@example.com",
        isAdmin: false,
      })),
    }));

    const { POST } = await import("@/app/api/payouts/withdraw/route");
    const req = new NextRequest("http://localhost/api/payouts/withdraw", {
      method: "POST",
      body: JSON.stringify({
        amount: 12000,
        currency: "RWF",
        idempotencyKey: "withdraw_key_1234",
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(json.accountNumber).toBe("400999888777");
    expect(json.method).toBe("I&M Bank");
    expect(withdrawWrites[0].accountNumber).toBe("400999888777");
    expect(withdrawWrites[0].accountName).toBe("Alice KYC");
    expect(withdrawWrites[0].bankName).toBe("I&M Bank");

    vi.doUnmock("@/db/firebaseAdmin");
    vi.doUnmock("@/lib/authMiddleware");
  });
});

describe("Payouts USD threshold with other currency balances", () => {
  it("keeps USD withdrawal closed when other currency balance converts below USD threshold", () => {
    const overview = buildPayoutOverview(
      {
        currency: "USD",
        pendingPayout: 500,
        pendingPayoutUSD: 0,
      },
      [
        { code: "RWF", payoutThreshold: 10000 },
        { code: "USD", payoutThreshold: 20 },
      ],
    );

    const enriched = enrichPayoutOverviewWithFx(
      overview,
      {
        base: "USD",
        rates: { RWF: 1400, USD: 1 },
        fetchedAt: new Date().toISOString(),
        source: "frankfurter",
      },
      150,
    );

    const usdBalance = enriched.perCurrencyBalances.find((b) => b.currency === "USD")!;
    expect(usdBalance.pending).toBe(0);
    expect(usdBalance.convertiblePending).toBeLessThan(20);
    const canWithdrawUsd =
      usdBalance.threshold !== null &&
      (usdBalance.pending >= usdBalance.threshold ||
        (usdBalance.convertiblePending ?? usdBalance.pending) >= usdBalance.threshold);
    expect(canWithdrawUsd).toBe(false);
  });

  it("opens USD withdrawal when combined convertible balance meets USD threshold", () => {
    const overview = buildPayoutOverview(
      {
        currency: "USD",
        pendingPayout: 35000,
        pendingPayoutUSD: 0,
      },
      [
        { code: "RWF", payoutThreshold: 10000 },
        { code: "USD", payoutThreshold: 20 },
      ],
    );

    const enriched = enrichPayoutOverviewWithFx(
      overview,
      {
        base: "USD",
        rates: { RWF: 1400, USD: 1 },
        fetchedAt: new Date().toISOString(),
        source: "frankfurter",
      },
      150,
    );

    const usdBalance = enriched.perCurrencyBalances.find((b) => b.currency === "USD")!;
    expect(usdBalance.convertiblePending).toBeGreaterThanOrEqual(20);
  });
});

describe("Creator location 1-month cooldown & anytime currency updates", () => {
  it("clamps month-end dates and enforces 1 calendar month cooldown", () => {
    const jan31 = new Date("2026-01-31T10:00:00.000Z");
    const feb20 = new Date("2026-02-20T10:00:00.000Z");
    const mar01 = new Date("2026-03-01T10:00:00.000Z");

    const blocked = evaluateLocationUpdateCooldown(jan31, feb20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.nextAllowedAt?.toISOString().slice(0, 10)).toBe("2026-02-28");

    const allowed = evaluateLocationUpdateCooldown(jan31, mar01);
    expect(allowed.allowed).toBe(true);
  });

  it("allows currency updates anytime while blocking a second location change within 1 month", async () => {
    vi.resetModules();

    const batchUpdates: Array<Record<string, unknown>> = [];
    const mockCreatorRef = { id: "alice", path: "creators/alice" };
    const recentDate = new Date(Date.now() - 5 * 86_400_000).toISOString();

    const mockDb = {
      batch: () => ({
        update: vi.fn((_ref: unknown, data: Record<string, unknown>) => {
          batchUpdates.push(data);
        }),
        set: vi.fn(),
        commit: vi.fn(async () => {}),
      }),
      collection: (name: string) => ({
        doc: (id?: string) => ({ id: id || "log_1" }),
        where: (_field: string, _op: string, val: string) => ({
          limit: () => ({
            get: async () => {
              if (name === "creators") {
                return {
                  empty: false,
                  docs: [
                    {
                      id: "alice",
                      ref: mockCreatorRef,
                      data: () => ({
                        uid: "uid-alice",
                        country: "RW",
                        currency: "RWF",
                        locationUpdatedAt: recentDate,
                      }),
                    },
                  ],
                };
              }
              if (name === "countries") {
                return {
                  empty: !["RW", "KE"].includes(val),
                  docs: [{ data: () => ({ code: val }) }],
                };
              }
              if (name === "currencies") {
                return {
                  empty: !["RWF", "USD"].includes(val),
                  docs: [{ data: () => ({ code: val }) }],
                };
              }
              return { empty: true, docs: [] };
            },
          }),
        }),
      }),
    };

    vi.doMock("@/db/firebaseAdmin", () => ({
      admin: { firestore: { FieldValue: { serverTimestamp: () => "TS" } } },
      adminDb: mockDb,
    }));
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAuth: vi.fn(async () => ({
        uid: "uid-alice",
        email: "alice@example.com",
        isAdmin: false,
      })),
    }));

    const { POST } = await import("@/app/api/creators/location-currency/route");

    // 1. Currency update anytime succeeds even during location cooldown
    const currencyRes = await POST(
      new NextRequest("http://localhost/api/creators/location-currency", {
        method: "POST",
        body: JSON.stringify({ currency: "USD" }),
      }),
    );
    expect(currencyRes.status).toBe(200);
    const currencyJson = (await currencyRes.json()) as Record<string, unknown>;
    expect(currencyJson.currency).toBe("USD");
    expect(batchUpdates[0].currency).toBe("USD");

    // 2. Location update within 1 month is rejected with 429
    const locationRes = await POST(
      new NextRequest("http://localhost/api/creators/location-currency", {
        method: "POST",
        body: JSON.stringify({ country: "KE" }),
      }),
    );
    expect(locationRes.status).toBe(429);
    const locationJson = (await locationRes.json()) as Record<string, unknown>;
    expect(locationJson.code).toBe("LOCATION_COOLDOWN");

    vi.doUnmock("@/db/firebaseAdmin");
    vi.doUnmock("@/lib/authMiddleware");
  });
});

describe("Card payment link recovery & fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("regenerates expired card link cleanly via Next.js recovery and updates transaction doc", async () => {
    vi.resetModules();

    const batchSets: Array<{ path: string; data: Record<string, unknown> }> = [];
    const batchUpdates: Array<{ path: string; data: Record<string, unknown> }> = [];

    const mockDb = {
      batch: () => ({
        set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
          batchSets.push({ path: ref.path, data });
        }),
        update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
          batchUpdates.push({ path: ref.path, data });
        }),
        commit: vi.fn(async () => {}),
      }),
      collection: (name: string) => ({
        doc: (id: string) => ({
          path: `${name}/${id}`,
          get: async () => {
            if (name === "transactions" && id === "AGS-CARD-OLD") {
              return {
                exists: true,
                id: "AGS-CARD-OLD",
                data: () => ({
                  ref: "AGS-CARD-OLD",
                  type: "support",
                  status: "pending",
                  paymentMethod: "card",
                  amount: 15,
                  currency: "USD",
                  creatorId: "alice",
                  creatorHandle: "alice",
                  supporterId: "uid-supporter",
                  redirectUrl: "https://pay.pesapal.com/expired",
                  redirectUrlGeneratedAt: "2026-10-01T00:00:00.000Z",
                  createdAt: "2026-10-01T00:00:00.000Z",
                }),
              };
            }
            return { exists: false };
          },
        }),
      }),
    };

    process.env.PESAPAL_URL = "https://pesapal.example.com";
    process.env.PESAPAL_CONSUMER_KEY = "ck_test";
    process.env.PESAPAL_CONSUMER_SECRET = "cs_test";
    process.env.PESAPAL_IPN_ID = "ipn_123";
    process.env.NEXT_PUBLIC_BASE_URL = "https://agaseke.me";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/Auth/RequestToken")) {
          return new Response(JSON.stringify({ token: "pesapal_tok" }), { status: 200 });
        }
        if (url.includes("/Transactions/SubmitOrderRequest")) {
          return new Response(
            JSON.stringify({
              redirect_url: "https://pay.pesapal.com/fresh-link",
              order_tracking_id: "track-999",
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );

    vi.doMock("@/db/firebaseAdmin", () => ({ adminDb: mockDb }));
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAuth: vi.fn(async () => ({
        uid: "uid-supporter",
        email: "supporter@example.com",
        isAdmin: false,
      })),
    }));

    const { POST } = await import("@/app/api/payments/transactions/resume/route");
    const res = await POST(
      new NextRequest("http://localhost/api/payments/transactions/resume", {
        method: "POST",
        body: JSON.stringify({ ref: "AGS-CARD-OLD" }),
      }),
    );
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.method).toBe("card");
    expect(json.redirect_url).toBe("https://pay.pesapal.com/fresh-link");
    expect(batchSets).toHaveLength(1);
    expect(batchSets[0].data.redirectUrl).toBe("https://pay.pesapal.com/fresh-link");
    expect(batchUpdates[0].data.redirectUrl).toBe("https://pay.pesapal.com/fresh-link");
    expect(batchUpdates[0].data.retriedRef).toBe(json.ref);

    vi.doUnmock("@/db/firebaseAdmin");
    vi.doUnmock("@/lib/authMiddleware");
  });

  it("falls back to /api/payments/transactions/resume in paymentsService when worker returns 404", async () => {
    vi.resetModules();

    vi.doMock("@/db/firebase", () => ({
      auth: {
        currentUser: {
          getIdToken: async () => "id-token-123",
        },
      },
    }));

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/payments/transactions/resume") && url.startsWith("http")) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      if (url === "/api/payments/transactions/resume") {
        return new Response(
          JSON.stringify({
            ref: "AGS-CARD-NEW",
            method: "card",
            redirect_url: "https://pay.pesapal.com/recovered",
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { resumeTransaction } = await import("@/lib/paymentsService");
    const res = await resumeTransaction("AGS-CARD-OLD");

    expect(res.ref).toBe("AGS-CARD-NEW");
    expect(res.redirect_url).toBe("https://pay.pesapal.com/recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.doUnmock("@/db/firebase");
  });
});
