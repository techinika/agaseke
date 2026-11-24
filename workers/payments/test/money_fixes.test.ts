import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env, InitRequest } from "../src/types";
import { calculateRevenue, calculateStoreRevenue } from "../src/revenue";
import { resolvePayment, type PaymentRepository } from "../src/services/pricing";

const mockFirestoreGet = vi.fn();
const mockFirestoreSet = vi.fn();
const mockFirestoreUpdateFields = vi.fn();
const mockFirestoreCreateIfAbsent = vi.fn();
const mockFirestoreQuery = vi.fn();
const mockFirestoreQueryAll = vi.fn();
const mockInitiateCardPayment = vi.fn();
const mockInitiateMomoPayment = vi.fn();

vi.mock("../src/firestore", () => ({
  convertToFields: (obj: Record<string, unknown>) => obj,
  convertFromFields: (obj: Record<string, unknown>) => obj,
  firestoreGet: (...args: unknown[]) => mockFirestoreGet(...args),
  firestoreSet: (...args: unknown[]) => mockFirestoreSet(...args),
  firestoreUpdateFields: (...args: unknown[]) => mockFirestoreUpdateFields(...args),
  firestoreCreateIfAbsent: (...args: unknown[]) => mockFirestoreCreateIfAbsent(...args),
  firestoreQuery: (...args: unknown[]) => mockFirestoreQuery(...args),
  firestoreQueryAll: (...args: unknown[]) => mockFirestoreQueryAll(...args),
}));

vi.mock("../src/services/card", () => ({
  initiateCardPayment: (...args: unknown[]) => mockInitiateCardPayment(...args),
}));

vi.mock("../src/services/momo", () => ({
  initiateMomoPayment: (...args: unknown[]) => mockInitiateMomoPayment(...args),
}));

import { failAttempt } from "../src/services/idempotency";
import { getUserTransactions } from "../src/services/transactions";
import { retryTransaction } from "../src/services/retry";

const minimalEnv = {
  FIREBASE_API_KEY: "test",
  FIREBASE_PROJECT_ID: "test",
  FIREBASE_CLIENT_EMAIL: "test@example.com",
  FIREBASE_PRIVATE_KEY: "test",
  PROCESSOR_FEE_PERCENT: "2",
} as unknown as Env;

function makeRepo(docs: Record<string, Record<string, unknown>>): PaymentRepository {
  return {
    async get(path) {
      return docs[path] ?? null;
    },
    async query(collection, field, value, limit = 20) {
      return Object.entries(docs)
        .filter(([path, doc]) => path.startsWith(`${collection}/`) && doc[field] === value)
        .slice(0, limit)
        .map(([path, doc]) => ({
          _id: path.split("/").pop(),
          ...doc,
        }));
    },
  };
}

describe("money flow & idempotency regression fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses 0.09/0.10/0.90/0.01 fallback percentages when env share vars are unset", () => {
    const withRef = calculateRevenue(10_000, true, minimalEnv);
    expect(withRef.platformShare).toBe(900);
    expect(withRef.creatorShare).toBe(9_000);
    expect(withRef.referralShare).toBe(100);

    const withoutRef = calculateRevenue(10_000, false, minimalEnv);
    expect(withoutRef.platformShare).toBe(1_000);
    expect(withoutRef.creatorShare).toBe(9_000);
    expect(withoutRef.referralShare).toBe(0);

    const storeNoRef = calculateStoreRevenue(10_000, "buyer", minimalEnv, false);
    expect(storeNoRef.platformFee).toBe(1_000);
    expect(storeNoRef.referralEarnings).toBe(0);
    expect(storeNoRef.creatorEarnings).toBe(10_000);
    expect(storeNoRef.totalAmount).toBe(11_000);
  });

  it("does not deduct 1% referral from store creatorEarnings when creator has no referrer", async () => {
    const resolved = await resolvePayment(
      minimalEnv,
      {
        creatorHandle: "noref",
        type: "store",
        productId: "p1",
        currency: "RWF",
      } as unknown as InitRequest,
      "buyer-1",
      makeRepo({
        "creators/noref": { uid: "uid-noref", currency: "RWF" },
        "profiles/uid-noref": {},
        "storeProducts/p1": {
          creatorUid: "uid-noref",
          name: "Shirt",
          price: 10_000,
          currency: "RWF",
          active: true,
        },
      }),
    );

    expect(resolved.includeReferral).toBe(false);
    expect(resolved.referralEarnings).toBe(0);
    expect(resolved.platformFee).toBe(1_000);
    expect(resolved.creatorEarnings).toBe(10_000);
    expect(resolved.totalAmount).toBe(11_000);
  });

  it("scales store fees proportionally after coupon discount, preserves sum invariant, and captures couponId", async () => {
    const resolved = await resolvePayment(
      minimalEnv,
      {
        creatorHandle: "alice",
        type: "store",
        productId: "p1",
        couponCode: "SAVE20",
        currency: "RWF",
      } as unknown as InitRequest,
      "buyer-1",
      makeRepo({
        "creators/alice": { uid: "uid-alice", currency: "RWF" },
        "creators/bob": { uid: "uid-bob", currency: "RWF" },
        "profiles/uid-alice": { referralCreator: "bob" },
        "storeProducts/p1": {
          creatorUid: "uid-alice",
          name: "Course",
          price: 10_000,
          currency: "RWF",
          active: true,
        },
        "storeCoupons/cpn-20": {
          creatorId: "alice",
          code: "SAVE20",
          discountType: "percentage",
          discountValue: 20,
          active: true,
        },
      }),
    );

    expect(resolved.couponId).toBe("cpn-20");
    expect(resolved.couponCode).toBe("SAVE20");
    expect(resolved.discount).toBe(2_000);
    expect(resolved.platformFee).toBe(800);
    expect(resolved.referralEarnings).toBe(80);
    expect(resolved.creatorEarnings).toBe(7_920);
    expect(resolved.totalAmount).toBe(8_800);
    expect(
      resolved.platformFee + resolved.creatorEarnings + resolved.referralEarnings,
    ).toBe(resolved.totalAmount);
  });

  it("ignores mismatched-currency fixed/explicit coupons on USD store purchases while allowing matching or universal percentage coupons", async () => {
    const repo = makeRepo({
      "creators/alice": { uid: "uid-alice", currency: "USD" },
      "profiles/uid-alice": {},
      "storeProducts/p-usd": {
        creatorUid: "uid-alice",
        name: "USD Preset",
        price: 50,
        currency: "USD",
        active: true,
      },
      "storeCoupons/cpn-rwf": {
        creatorId: "alice",
        code: "RWF500",
        discountType: "fixed",
        discountValue: 500,
        currency: "RWF",
        active: true,
      },
      "storeCoupons/cpn-legacy-fixed": {
        creatorId: "alice",
        code: "OLDFIXED",
        discountType: "fixed",
        discountValue: 500,
        active: true,
      },
      "storeCoupons/cpn-usd": {
        creatorId: "alice",
        code: "USD10",
        discountType: "fixed",
        discountValue: 10,
        currency: "USD",
        active: true,
      },
    });

    await expect(
      resolvePayment(
        minimalEnv,
        {
          creatorHandle: "alice",
          type: "store",
          productId: "p-usd",
          couponCode: "RWF500",
          currency: "USD",
        } as unknown as InitRequest,
        "buyer-1",
        repo,
      ),
    ).rejects.toThrow(/only valid for RWF purchases/i);

    await expect(
      resolvePayment(
        minimalEnv,
        {
          creatorHandle: "alice",
          type: "store",
          productId: "p-usd",
          couponCode: "OLDFIXED",
          currency: "USD",
        } as unknown as InitRequest,
        "buyer-1",
        repo,
      ),
    ).rejects.toThrow(/only valid for RWF purchases/i);

    const matchedUsd = await resolvePayment(
      minimalEnv,
      {
        creatorHandle: "alice",
        type: "store",
        productId: "p-usd",
        couponCode: "USD10",
        currency: "USD",
      } as unknown as InitRequest,
      "buyer-1",
      repo,
    );
    expect(matchedUsd.discount).toBe(10);
    expect(matchedUsd.couponCode).toBe("USD10");
  });

  it("falls back to legacy price when prices map is an empty object", async () => {
    const resolved = await resolvePayment(
      minimalEnv,
      {
        creatorHandle: "alice",
        type: "community",
        communityTierId: "t1",
        communitySubscriptionId: "sub-1",
        communityInterval: "monthly",
        currency: "USD",
      } as unknown as InitRequest,
      "user-1",
      makeRepo({
        "creators/alice": {
          uid: "uid-alice",
          currency: "USD",
          communityTiers: [
            {
              id: "t1",
              isActive: true,
              currency: "USD",
              price: 12,
              prices: {},
            },
          ],
        },
        "communitySubscriptions/sub-1": {
          userId: "user-1",
          tierId: "t1",
          creatorHandle: "alice",
        },
      }),
    );

    expect(resolved.currency).toBe("USD");
    expect(resolved.totalAmount).toBe(12);
  });

  it("does not overwrite initiated paymentAttempts in failAttempt and preserves existing fields via updateMask", async () => {
    mockFirestoreGet.mockResolvedValueOnce({
      fields: {
        idempotencyKey: "idem-ok",
        status: "initiated",
        ref: "AGS-CARD-123",
      },
    });
    await failAttempt(minimalEnv, "idem-ok", new Error("post-init error"));
    expect(mockFirestoreUpdateFields).not.toHaveBeenCalled();
    expect(mockFirestoreSet).not.toHaveBeenCalled();

    mockFirestoreGet.mockResolvedValueOnce({
      fields: {
        idempotencyKey: "idem-reserved",
        uid: "u1",
        requestHash: "abc",
        status: "reserved",
      },
    });
    mockFirestoreUpdateFields.mockResolvedValueOnce({ ok: true });
    await failAttempt(minimalEnv, "idem-reserved", new Error("gateway down"));
    expect(mockFirestoreUpdateFields).toHaveBeenCalledWith(
      minimalEnv,
      "paymentAttempts/idem-reserved",
      expect.objectContaining({ status: "failed", error: "gateway down" }),
    );
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it("preserves USD and resolves pre-Dec-2026 missing currency to RWF in getUserTransactions", async () => {
    mockFirestoreQueryAll
      .mockResolvedValueOnce([
        {
          fields: {
            ref: "TX-USD-PRE",
            status: "successful",
            currency: "USD",
            amount: 15,
            createdAt: "2026-06-01T12:00:00.000Z",
          },
        },
        {
          fields: {
            ref: "TX-LEGACY-NO-CUR",
            status: "successful",
            amount: 5000,
            createdAt: "2026-05-01T12:00:00.000Z",
          },
        },
        {
          fields: {
            ref: "TX-POST-NO-CUR",
            status: "pending",
            amount: 20,
            createdAt: "2026-12-10T12:00:00.000Z",
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const page = await getUserTransactions(minimalEnv, "user-1");
    const byRef = Object.fromEntries(page.transactions.map((t) => [t.ref, t]));
    expect(byRef["TX-USD-PRE"].currency).toBe("USD");
    expect(byRef["TX-LEGACY-NO-CUR"].currency).toBe("RWF");
    expect(byRef["TX-POST-NO-CUR"].currency).toBe("");
  });

  it("preserves USD on retry, defaults pre-Dec-2026 missing currency to RWF, and rejects post-cutoff missing currency", async () => {
    mockFirestoreQuery.mockResolvedValueOnce([
      {
        name: "projects/test/databases/(default)/documents/transactions/tx-usd",
        fields: {
          ref: "TX-USD-RETRY",
          supporterId: "user-1",
          status: "failed",
          paymentMethod: "card",
          currency: "USD",
          amount: 25,
          creatorId: "alice",
          createdAt: "2026-04-10T00:00:00.000Z",
        },
      },
    ]);
    mockInitiateCardPayment.mockResolvedValueOnce({
      ref: "TX-USD-RETRY-2",
      redirect_url: "https://pay.test/checkout",
      merchant_reference: "TX-USD-RETRY-2",
    });
    mockFirestoreSet.mockResolvedValueOnce({ ok: true });

    await retryTransaction(minimalEnv, "user-1", "TX-USD-RETRY");
    expect(mockInitiateCardPayment).toHaveBeenCalledWith(
      minimalEnv,
      expect.objectContaining({ currency: "USD", amount: 25 }),
      "user-1",
      "retry_tx-usd_1",
      expect.any(Object),
    );

    mockFirestoreQuery.mockResolvedValueOnce([
      {
        name: "projects/test/databases/(default)/documents/transactions/tx-post-missing",
        fields: {
          ref: "TX-POST-MISSING",
          supporterId: "user-1",
          status: "failed",
          paymentMethod: "card",
          amount: 25,
          creatorId: "alice",
          createdAt: "2026-12-05T00:00:00.000Z",
        },
      },
    ]);
    await expect(
      retryTransaction(minimalEnv, "user-1", "TX-POST-MISSING"),
    ).rejects.toThrow(/missing currency/i);
  });
});
