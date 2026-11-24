import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env, InitRequest } from "../src/types";
import { calculateRevenue, calculateStoreRevenue } from "../src/revenue";
import { resolvePayment, type PaymentRepository } from "../src/services/pricing";

const mockFirestoreGet = vi.fn();
const mockFirestoreSet = vi.fn();
const mockFirestoreUpdateFields = vi.fn();
const mockFirestoreCreateIfAbsent = vi.fn();

vi.mock("../src/firestore", () => ({
  convertToFields: (obj: Record<string, unknown>) => obj,
  convertFromFields: (obj: Record<string, unknown>) => obj,
  firestoreGet: (...args: unknown[]) => mockFirestoreGet(...args),
  firestoreSet: (...args: unknown[]) => mockFirestoreSet(...args),
  firestoreUpdateFields: (...args: unknown[]) => mockFirestoreUpdateFields(...args),
  firestoreCreateIfAbsent: (...args: unknown[]) => mockFirestoreCreateIfAbsent(...args),
}));

import { failAttempt } from "../src/services/idempotency";

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
});
