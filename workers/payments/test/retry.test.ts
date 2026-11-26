import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const mockFirestoreQuery = vi.fn();
const mockFirestoreGet = vi.fn();
const mockFirestoreSet = vi.fn();
const mockInitiateCard = vi.fn();
const mockInitiateMomo = vi.fn();

vi.mock("../src/firestore", () => ({
  convertFromFields: (fields: Record<string, unknown>) => fields,
  convertToFields: (obj: Record<string, unknown>) => obj,
  firestoreQuery: (...args: unknown[]) => mockFirestoreQuery(...args),
  firestoreGet: (...args: unknown[]) => mockFirestoreGet(...args),
  firestoreSet: (...args: unknown[]) => mockFirestoreSet(...args),
}));

vi.mock("../src/services/card", () => ({
  initiateCardPayment: (...args: unknown[]) => mockInitiateCard(...args),
}));

vi.mock("../src/services/momo", () => ({
  initiateMomoPayment: (...args: unknown[]) => mockInitiateMomo(...args),
}));

import { cancelTransaction, retryTransaction } from "../src/services/retry";

const env = {} as Env;

describe("worker retryTransaction card link resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreSet.mockResolvedValue({});
  });

  it("falls back to direct document lookup by ID when ref query returns empty and reuses fresh card link", async () => {
    const freshTimestamp = new Date().toISOString();
    mockFirestoreQuery.mockResolvedValue([]);
    mockFirestoreGet.mockResolvedValue({
      name: "projects/test/databases/(default)/documents/transactions/AGS-CARD-DIRECT",
      fields: {
        ref: "AGS-CARD-DIRECT",
        supporterId: "uid-1",
        status: "pending",
        paymentMethod: "card",
        redirectUrl: "https://pay.pesapal.com/live-checkout",
        redirectUrlGeneratedAt: freshTimestamp,
        orderTrackingId: "trk-1",
      },
    });

    const res = await retryTransaction(env, "uid-1", "AGS-CARD-DIRECT", {
      allowPending: true,
    });

    expect(res.method).toBe("card");
    expect(res.redirect_url).toBe("https://pay.pesapal.com/live-checkout");
    expect(mockInitiateCard).not.toHaveBeenCalled();
  });

  it("regenerates expired card checkout links instead of returning stale URLs", async () => {
    mockFirestoreQuery.mockResolvedValue([
      {
        name: "projects/test/databases/(default)/documents/transactions/AGS-CARD-STALE",
        fields: {
          ref: "AGS-CARD-STALE",
          supporterId: "uid-1",
          creatorId: "alice",
          status: "pending",
          paymentMethod: "card",
          amount: 10,
          currency: "USD",
          redirectUrl: "https://pay.pesapal.com/stale",
          redirectUrlGeneratedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ]);
    mockInitiateCard.mockResolvedValue({
      ref: "AGS-CARD-FRESH",
      redirect_url: "https://pay.pesapal.com/fresh",
      merchant_reference: "AGS-CARD-FRESH",
    });

    const res = await retryTransaction(env, "uid-1", "AGS-CARD-STALE", {
      allowPending: true,
    });

    expect(mockInitiateCard).toHaveBeenCalledTimes(1);
    expect(res.ref).toBe("AGS-CARD-FRESH");
    expect(res.redirect_url).toBe("https://pay.pesapal.com/fresh");
  });
});

describe("worker cancelTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreSet.mockResolvedValue({});
  });

  it("cancels a pending transaction owned by the caller", async () => {
    mockFirestoreQuery.mockResolvedValue([
      {
        name: "projects/test/databases/(default)/documents/transactions/TX-PENDING-1",
        fields: {
          ref: "TX-PENDING-1",
          supporterId: "uid-1",
          status: "pending",
        },
      },
    ]);

    const res = await cancelTransaction(env, "uid-1", "TX-PENDING-1");
    expect(res).toEqual({ ref: "TX-PENDING-1", status: "cancelled" });
    expect(mockFirestoreSet).toHaveBeenCalledTimes(1);
    const saved = mockFirestoreSet.mock.calls[0][2] as Record<string, unknown>;
    expect(saved.status).toBe("cancelled");
    expect(saved.cancelledBy).toBe("user");
  });

  it("rejects cancellation of another user's transaction", async () => {
    mockFirestoreQuery.mockResolvedValue([
      {
        name: "projects/test/databases/(default)/documents/transactions/TX-OTHER",
        fields: {
          ref: "TX-OTHER",
          supporterId: "uid-2",
          status: "pending",
        },
      },
    ]);

    await expect(cancelTransaction(env, "uid-1", "TX-OTHER")).rejects.toThrow(
      "You can only cancel your own transactions",
    );
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it("rejects cancellation of already-completed transactions", async () => {
    mockFirestoreQuery.mockResolvedValue([
      {
        name: "projects/test/databases/(default)/documents/transactions/TX-PAID",
        fields: {
          ref: "TX-PAID",
          supporterId: "uid-1",
          status: "successful",
        },
      },
    ]);

    await expect(cancelTransaction(env, "uid-1", "TX-PAID")).rejects.toThrow(
      "Completed transactions cannot be cancelled",
    );
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});
