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

import { retryTransaction } from "../src/services/retry";

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
