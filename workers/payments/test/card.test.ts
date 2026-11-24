import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env, InitRequest } from "../src/types";

const mockRepoGet = vi.fn();
const mockRepoQuery = vi.fn();
const mockFirestoreSet = vi.fn();
const mockLogActivity = vi.fn();
const mockNotifyAdmins = vi.fn();
const mockBeginAttempt = vi.fn();
const mockFinishAttempt = vi.fn();
const mockAbortAttempt = vi.fn();

vi.mock("../src/services/repository", () => ({
  createPaymentRepository: () => ({
    get: mockRepoGet,
    query: mockRepoQuery,
  }),
}));

vi.mock("../src/services/quotes", () => ({
  loadCheckoutQuote: async () => null,
  consumeCheckoutQuote: async () => {},
}));

vi.mock("../src/services/initiate", () => ({
  beginIdempotentAttempt: (...args: unknown[]) => mockBeginAttempt(...args),
  finishAttempt: (...args: unknown[]) => mockFinishAttempt(...args),
  abortAttempt: (...args: unknown[]) => mockAbortAttempt(...args),
  buildRetryPayload: (_resolved: unknown, body: unknown) => body,
}));

vi.mock("../src/firestore", () => ({
  convertToFields: (obj: Record<string, unknown>) => obj,
  firestoreSet: (...args: unknown[]) => mockFirestoreSet(...args),
}));

vi.mock("../src/logger", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

vi.mock("../src/adminNotifications", () => ({
  notifyAdmins: (...args: unknown[]) => mockNotifyAdmins(...args),
}));

import { initiateCardPayment } from "../src/services/card";

const baseEnv = {
  FIREBASE_API_KEY: "test",
  FIREBASE_PROJECT_ID: "test",
  FIREBASE_CLIENT_EMAIL: "test@example.com",
  FIREBASE_PRIVATE_KEY: "test",
  PAYPACK_CLIENT_ID: "test",
  PAYPACK_CLIENT_SECRET: "test",
  PAYPACK_WEBHOOK_SECRET: "test",
  PESAPAL_URL: "https://pesapal.example.com",
  PESAPAL_CONSUMER_KEY: "ck_test",
  PESAPAL_CONSUMER_SECRET: "cs_test",
  PESAPAL_IPN_ID: "fallback-ipn-id",
  APP_URL: "https://agaseke.me",
  NEXT_PUBLIC_PLATFORM_SHARE: "0.15",
  NEXT_PUBLIC_CREATOR_SHARE: "0.8",
  NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL: "0.15",
  NEXT_PUBLIC_REFERRAL_SHARE: "0.01",
  PAYMENTS_WORKER_URL: "https://payments.api.agaseke.me",
  COMMS_WORKER_URL: "https://comms.example.com",
  SUPPORT_WORKER_URL: "https://support.example.com",
  STORE_WORKER_URL: "https://store.example.com",
  BOOKINGS_WORKER_URL: "https://bookings.example.com",
  COMMUNITY_WORKER_URL: "https://community.example.com",
  INTERNAL_AUTH_SECRET: "test",
  PROCESSOR_FEE_PERCENT: "2",
} as Env;

describe("initiateCardPayment Pesapal resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepoGet.mockImplementation(async (path: string) => {
      if (path === "creators/alice") {
        return { uid: "uid-alice", currency: "RWF" };
      }
      if (path === "bookingRequests/bk-1") {
        return {
          id: "bk-1",
          creatorHandle: "alice",
          creatorUid: "uid-alice",
          status: "pending",
          paymentStatus: "pending",
          currency: "RWF",
          paymentAmount: 5000,
          bookerName: "Pat",
          bookerEmail: "pat@example.com",
        };
      }
      if (path === "storeProducts/p1") {
        return {
          id: "p1",
          creatorUid: "uid-alice",
          name: "Very Long Product Name ".repeat(8),
          price: 2000,
          currency: "RWF",
          active: true,
        };
      }
      return null;
    });
    mockRepoQuery.mockResolvedValue([]);
    mockBeginAttempt.mockResolvedValue({ duplicate: false, key: "idem-1" });
    mockFinishAttempt.mockResolvedValue(undefined);
    mockAbortAttempt.mockResolvedValue(undefined);
    mockFirestoreSet.mockResolvedValue({ name: "tx/1" });
    mockLogActivity.mockResolvedValue(undefined);
    mockNotifyAdmins.mockResolvedValue(undefined);
  });

  it("falls back to PESAPAL_IPN_ID when dynamic RegisterIPN fails during booking checkout", async () => {
    const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        fetchCalls.push({ url, body });

        if (url.endsWith("/api/Auth/RequestToken")) {
          return new Response(JSON.stringify({ token: "pesapal-jwt" }), { status: 200 });
        }
        if (url.endsWith("/api/URLSetup/RegisterIPN")) {
          return new Response(JSON.stringify({ error: { message: "IPN limit reached" } }), {
            status: 400,
          });
        }
        if (url.endsWith("/api/Transactions/SubmitOrderRequest")) {
          return new Response(
            JSON.stringify({
              redirect_url: "https://pesapal.example.com/pay/123",
              order_tracking_id: "track-123",
            }),
            { status: 200 },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );

    const result = await initiateCardPayment(
      baseEnv,
      {
        type: "booking",
        creatorHandle: "alice",
        bookingId: "bk-1",
      } as unknown as InitRequest,
      "buyer-1",
      "idem-1",
    );

    expect(result.redirect_url).toBe("https://pesapal.example.com/pay/123");
    const submitCall = fetchCalls.find((c) =>
      c.url.endsWith("/api/Transactions/SubmitOrderRequest"),
    );
    expect(submitCall?.body.notification_id).toBe("fallback-ipn-id");
    expect((submitCall?.body.billing_address as Record<string, unknown>).first_name).toBe("Pat");
    expect((submitCall?.body.billing_address as Record<string, unknown>).last_name).toBe("Agaseke");
  });

  it("rejects HTTP 200 Pesapal auth or submit payloads that contain an error object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/api/Auth/RequestToken")) {
          return new Response(
            JSON.stringify({ error: { code: "invalid_consumer_key_or_secret", message: "Bad creds" } }),
            { status: 200 },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );

    await expect(
      initiateCardPayment(
        baseEnv,
        {
          type: "booking",
          creatorHandle: "alice",
          bookingId: "bk-1",
        } as unknown as InitRequest,
        "buyer-1",
        "idem-2",
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_AUTH_FAILED", statusCode: 502 });
    expect(mockAbortAttempt).toHaveBeenCalled();
  });

  it("persists items and shippingAddress on card store transactions and caps description to 100 chars", async () => {
    const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        fetchCalls.push({ url, body });

        if (url.endsWith("/api/Auth/RequestToken")) {
          return new Response(JSON.stringify({ token: "pesapal-jwt" }), { status: 200 });
        }
        if (url.endsWith("/api/URLSetup/RegisterIPN")) {
          return new Response(JSON.stringify({ ipn_id: "live-ipn-1" }), { status: 200 });
        }
        if (url.endsWith("/api/Transactions/SubmitOrderRequest")) {
          return new Response(
            JSON.stringify({
              redirect_url: "https://pesapal.example.com/pay/store-1",
              order_tracking_id: "track-store-1",
            }),
            { status: 200 },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );

    await initiateCardPayment(
      baseEnv,
      {
        type: "store",
        creatorHandle: "alice",
        items: [{ productId: "p1", quantity: 1 }],
        shippingAddress: {
          fullName: "Pat Buyer",
          phone: "0788000000",
          address: "KN 5 Rd",
          city: "Kigali",
          country: "Rwanda",
        },
        currency: "RWF",
      } as unknown as InitRequest,
      "buyer-1",
      "idem-3",
    );

    const submitCall = fetchCalls.find((c) =>
      c.url.endsWith("/api/Transactions/SubmitOrderRequest"),
    );
    expect(String(submitCall?.body.description).length).toBeLessThanOrEqual(100);
    const savedTx = mockFirestoreSet.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(Array.isArray(savedTx.items)).toBe(true);
    expect(savedTx.shippingAddress).toMatchObject({ city: "Kigali" });
  });

  it("uses allowlisted requestOrigin for Pesapal callback_url and ignores untrusted origins", async () => {
    const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        fetchCalls.push({ url, body });
        if (url.endsWith("/api/Auth/RequestToken")) {
          return new Response(JSON.stringify({ token: "pesapal-jwt" }), { status: 200 });
        }
        if (url.endsWith("/api/URLSetup/RegisterIPN")) {
          return new Response(JSON.stringify({ ipn_id: "live-ipn-1" }), { status: 200 });
        }
        if (url.endsWith("/api/Transactions/SubmitOrderRequest")) {
          return new Response(
            JSON.stringify({
              redirect_url: "https://pesapal.example.com/pay/staging",
              order_tracking_id: "track-staging",
            }),
            { status: 200 },
          );
        }
        return new Response("Not Found", { status: 404 });
      }),
    );

    await initiateCardPayment(
      baseEnv,
      { type: "booking", creatorHandle: "alice", bookingId: "bk-1" } as unknown as InitRequest,
      "buyer-1",
      "idem-staging-1",
      { requestOrigin: "https://staging.agaseke.me" },
    );
    const stagingSubmit = fetchCalls.find((c) =>
      c.url.endsWith("/api/Transactions/SubmitOrderRequest"),
    );
    expect(stagingSubmit?.body.callback_url).toBe("https://staging.agaseke.me/payment");

    fetchCalls.length = 0;
    await initiateCardPayment(
      baseEnv,
      { type: "booking", creatorHandle: "alice", bookingId: "bk-1" } as unknown as InitRequest,
      "buyer-1",
      "idem-evil-1",
      { requestOrigin: "https://evil.example.com" },
    );
    const fallbackSubmit = fetchCalls.find((c) =>
      c.url.endsWith("/api/Transactions/SubmitOrderRequest"),
    );
    expect(fallbackSubmit?.body.callback_url).toBe("https://agaseke.me/payment");
  });
});
