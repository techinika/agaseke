import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const mockResolvePayment = vi.fn();
const mockLoadCheckoutQuote = vi.fn();
const mockConsumeCheckoutQuote = vi.fn();
const mockFirestorePost = vi.fn();
const mockLogActivity = vi.fn();
const mockNotifyAdmins = vi.fn();

vi.mock("../src/services/repository", () => ({
  createPaymentRepository: () => ({}),
}));

vi.mock("../src/services/pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/pricing")>();
  return {
    ...actual,
    resolvePayment: (...args: unknown[]) => mockResolvePayment(...args),
  };
});

vi.mock("../src/services/quotes", () => ({
  loadCheckoutQuote: (...args: unknown[]) => mockLoadCheckoutQuote(...args),
  consumeCheckoutQuote: (...args: unknown[]) => mockConsumeCheckoutQuote(...args),
}));

vi.mock("../src/services/initiate", () => ({
  beginIdempotentAttempt: vi.fn().mockResolvedValue({ duplicate: false }),
  finishAttempt: vi.fn().mockResolvedValue(undefined),
  abortAttempt: vi.fn().mockResolvedValue(undefined),
  buildRetryPayload: vi.fn().mockReturnValue({}),
}));

vi.mock("../src/firestore", () => ({
  convertToFields: (obj: Record<string, unknown>) => obj,
  firestorePost: (...args: unknown[]) => mockFirestorePost(...args),
}));

vi.mock("../src/logger", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

vi.mock("../src/adminNotifications", () => ({
  notifyAdmins: (...args: unknown[]) => mockNotifyAdmins(...args),
}));

import { initiateMomoPayment } from "../src/services/momo";
import { PaymentRequestError } from "../src/services/pricing";

const env = {
  PAYPACK_CLIENT_ID: "id",
  PAYPACK_CLIENT_SECRET: "secret",
} as unknown as Env;

describe("initiateMomoPayment store and phone resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCheckoutQuote.mockResolvedValue(null);
    mockConsumeCheckoutQuote.mockResolvedValue(undefined);
    mockFirestorePost.mockResolvedValue({});
    mockLogActivity.mockResolvedValue(undefined);
    mockNotifyAdmins.mockResolvedValue(undefined);
    mockResolvePayment.mockResolvedValue({
      type: "store",
      creatorHandle: "alice",
      creatorUid: "uid-alice",
      currency: "RWF",
      totalAmount: 5000,
      platformFee: 500,
      creatorEarnings: 4500,
      referralEarnings: 0,
      includeReferral: false,
      orderId: "ord-1",
    });
  });

  it("normalizes +25078... phone numbers to local 078... format before calling Paypack", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: "tok-1" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ref: "PAYPACK-123" }), { status: 200 }),
      );

    const res = await initiateMomoPayment(
      env,
      { type: "store", creatorHandle: "alice", orderId: "ord-1", phone: "+250 781 234 567" },
      "buyer-1",
    );

    expect(res).toEqual({ ref: "PAYPACK-123", status: "pending" });
    const cashinCall = fetchSpy.mock.calls[1];
    expect(JSON.parse(String(cashinCall[1]?.body))).toEqual({
      amount: 5000,
      number: "0781234567",
    });
    fetchSpy.mockRestore();
  });

  it("rejects invalid mobile money phone numbers with a 400 PaymentRequestError", async () => {
    await expect(
      initiateMomoPayment(
        env,
        { type: "store", creatorHandle: "alice", orderId: "ord-1", phone: "12345" },
        "buyer-1",
      ),
    ).rejects.toMatchObject({
      code: "INVALID_PHONE",
      statusCode: 400,
    });
  });

  it("isolates Paypack network errors into a structured 502 error instead of crashing", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    await expect(
      initiateMomoPayment(
        env,
        { type: "store", creatorHandle: "alice", orderId: "ord-1", phone: "0781234567" },
        "buyer-1",
      ),
    ).rejects.toBeInstanceOf(PaymentRequestError);

    fetchSpy.mockRestore();
  });
});
