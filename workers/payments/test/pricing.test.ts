import { describe, expect, it } from "vitest";
import type { Env, InitRequest } from "../src/types";
import {
  FORBIDDEN_REQUEST_FIELDS,
  PaymentRequestError,
  resolvePayment,
  type PaymentRepository,
} from "../src/services/pricing";

const env = {
  FIREBASE_API_KEY: "test",
  FIREBASE_PROJECT_ID: "test",
  FIREBASE_CLIENT_EMAIL: "test@example.com",
  FIREBASE_PRIVATE_KEY: "test",
  PAYPACK_CLIENT_ID: "test",
  PAYPACK_CLIENT_SECRET: "test",
  PAYPACK_WEBHOOK_SECRET: "test",
  PESAPAL_URL: "https://example.com",
  PESAPAL_CONSUMER_KEY: "test",
  PESAPAL_CONSUMER_SECRET: "test",
  PESAPAL_IPN_ID: "test",
  APP_URL: "https://example.com",
  NEXT_PUBLIC_PLATFORM_SHARE: "0.15",
  NEXT_PUBLIC_CREATOR_SHARE: "0.8",
  NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL: "0.15",
  NEXT_PUBLIC_REFERRAL_SHARE: "0.01",
  PAYMENTS_WORKER_URL: "https://example.com",
  COMMS_WORKER_URL: "https://example.com",
  SUPPORT_WORKER_URL: "https://example.com",
  STORE_WORKER_URL: "https://example.com",
  BOOKINGS_WORKER_URL: "https://example.com",
  COMMUNITY_WORKER_URL: "https://example.com",
  INTERNAL_AUTH_SECRET: "test",
  PROCESSOR_FEE_PERCENT: "2",
} as Env;

function makeRepo(docs: Record<string, Record<string, unknown>>): PaymentRepository {
  return {
    async get(path) {
      return docs[path] ?? null;
    },
    async query(collection, field, value, limit = 20) {
      return Object.entries(docs)
        .filter(([path, doc]) => path.startsWith(`${collection}/`) && doc[field] === value)
        .slice(0, limit)
        .map(([, doc]) => doc);
    },
  };
}

const baseDocs: Record<string, Record<string, unknown>> = {
  "creators/alice": { uid: "uid-alice", currency: "RWF" },
  "creators/bob": { uid: "uid-bob", currency: "RWF" },
  "profiles/uid-alice": { referralCreator: "bob" },
  "currencies/RWF": { code: "RWF", minSupportAmount: 100 },
};

function body(extra: Record<string, unknown>): InitRequest {
  return extra as unknown as InitRequest;
}

describe("server-authoritative payment pricing", () => {
  it("derives the creator UID and fees for support", async () => {
    const resolved = await resolvePayment(
      env,
      body({ creatorHandle: "alice", type: "support", amount: 5000, currency: "RWF" }),
      "supporter-1",
      makeRepo(baseDocs),
    );

    expect(resolved.creatorUid).toBe("uid-alice");
    expect(resolved.totalAmount).toBe(5000);
    expect(resolved.platformFee).toBe(750);
    expect(resolved.creatorEarnings).toBe(4000);
    expect(resolved.processorCost).toBe(100);
    expect(resolved.includeReferral).toBe(true);
    expect(resolved.referralUid).toBe("uid-bob");
  });

  it("accepts creatorId only as a legacy handle alias", async () => {
    const resolved = await resolvePayment(
      env,
      body({ creatorId: "alice", type: "support", amount: 1000, currency: "RWF" }),
      "supporter-1",
      makeRepo(baseDocs),
    );
    expect(resolved.creatorHandle).toBe("alice");
    expect(resolved.creatorUid).toBe("uid-alice");
  });

  it("rejects client-supplied trusted fields", async () => {
    await expect(
      resolvePayment(
        env,
        body({
          creatorHandle: "alice",
          type: "support",
          amount: 1000,
          creatorUid: "attacker",
        }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "TRUSTED_FIELD_REJECTED" });

    await expect(
      resolvePayment(
        env,
        body({
          creatorHandle: "alice",
          type: "store",
          productId: "p1",
          amount: 1,
        }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "TRUSTED_FIELD_REJECTED" });
  });

  it("rejects every server-owned field", async () => {
    for (const field of FORBIDDEN_REQUEST_FIELDS) {
      await expect(
        resolvePayment(
          env,
          body({
            creatorHandle: "alice",
            type: "support",
            amount: 1000,
            [field]: field === "creatorUid" ? "attacker" : 1,
          }),
          "supporter-1",
          makeRepo(baseDocs),
        ),
      ).rejects.toMatchObject({ code: "TRUSTED_FIELD_REJECTED" });
    }
  });

  it("accepts a free amount for gifts and rejects it for derived prices", async () => {
    const gift = await resolvePayment(
      env,
      body({ creatorHandle: "alice", type: "gift", amount: 2000, currency: "RWF" }),
      "supporter-1",
      makeRepo(baseDocs),
    );
    expect(gift.totalAmount).toBe(2000);
    expect(gift.type).toBe("gift");

    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "booking", bookingId: "b1", amount: 1 }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "TRUSTED_FIELD_REJECTED" });
  });

  it("rejects amounts outside the configured range", async () => {
    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "support", amount: 1, currency: "RWF" }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "AMOUNT_OUT_OF_RANGE" });

    await expect(
      resolvePayment(
        env,
        body({
          creatorHandle: "alice",
          type: "support",
          amount: 10_000_001,
          currency: "RWF",
        }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "AMOUNT_OUT_OF_RANGE" });
  });

  it("rejects a fractional RWF amount", async () => {
    await expect(
      resolvePayment(
        env,
        body({
          creatorHandle: "alice",
          type: "support",
          amount: 100.5,
          currency: "RWF",
        }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
  });

  it("rejects an unknown creator and type", async () => {
    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "nobody", type: "support", amount: 1000 }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN_CREATOR" });

    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "nonsense", amount: 1000 }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_TYPE" });
  });

  it("rejects a type that contradicts the supplied identifier", async () => {
    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "store", bookingId: "b1" }),
        "supporter-1",
        makeRepo(baseDocs),
      ),
    ).rejects.toMatchObject({ code: "TYPE_MISMATCH" });
  });

  it("loads the product price instead of trusting the client", async () => {
    const docs = {
      ...baseDocs,
      "storeProducts/p1": {
        id: "p1",
        creatorUid: "uid-alice",
        name: "Mug",
        price: 2000,
        currency: "RWF",
        active: true,
        type: "physical",
        stock: 5,
      },
    };

    const resolved = await resolvePayment(
      env,
      body({
        creatorHandle: "alice",
        type: "store",
        productId: "p1",
        quantity: 2,
        currency: "RWF",
      }),
      "buyer-1",
      makeRepo(docs),
    );

    expect(resolved.productPrice).toBe(2000);
    expect(resolved.quantity).toBe(2);
    expect(resolved.totalAmount).toBe(4600);
  });

  it("rejects a product owned by another creator", async () => {
    const docs = {
      ...baseDocs,
      "storeProducts/p1": {
        id: "p1",
        creatorUid: "uid-bob",
        name: "Mug",
        price: 2000,
        currency: "RWF",
        active: true,
      },
    };

    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "store", productId: "p1" }),
        "buyer-1",
        makeRepo(docs),
      ),
    ).rejects.toMatchObject({ code: "PRODUCT_CREATOR_MISMATCH" });
  });

  it("loads the booking amount and validates ownership", async () => {
    const docs = {
      ...baseDocs,
      "bookingRequests/b1": {
        id: "b1",
        creatorHandle: "alice",
        creatorUid: "uid-alice",
        status: "accepted",
        paymentStatus: "unpaid",
        currency: "RWF",
        paymentAmount: 15000,
        bookerName: "Buyer",
        bookerEmail: "buyer@example.com",
      },
    };

    const resolved = await resolvePayment(
      env,
      body({ creatorHandle: "alice", type: "booking", bookingId: "b1" }),
      "buyer-1",
      makeRepo(docs),
    );

    expect(resolved.totalAmount).toBe(15000);
    expect(resolved.bookingId).toBe("b1");
  });

  it("rejects a booking that is already paid", async () => {
    const docs = {
      ...baseDocs,
      "bookingRequests/b1": {
        id: "b1",
        creatorHandle: "alice",
        creatorUid: "uid-alice",
        status: "accepted",
        paymentStatus: "paid",
        currency: "RWF",
        paymentAmount: 15000,
      },
    };

    await expect(
      resolvePayment(
        env,
        body({ creatorHandle: "alice", type: "booking", bookingId: "b1" }),
        "buyer-1",
        makeRepo(docs),
      ),
    ).rejects.toMatchObject({ code: "BOOKING_ALREADY_PAID" });
  });

  it("loads the gathering price from Firestore", async () => {
    const docs = {
      ...baseDocs,
      "creatorGatherings/g1": {
        id: "g1",
        creatorId: "uid-alice",
        status: "active",
        currency: "RWF",
        ticketPrice: 3000,
      },
    };

    const resolved = await resolvePayment(
      env,
      body({ creatorHandle: "alice", type: "gathering", gatheringId: "g1" }),
      "buyer-1",
      makeRepo(docs),
    );

    expect(resolved.totalAmount).toBe(3000);
  });

  it("derives the community tier price and validates the subscription", async () => {
    const docs = {
      ...baseDocs,
      "creators/alice": {
        uid: "uid-alice",
        currency: "RWF",
        communityTiers: [{ id: "t1", price: 5000, interval: "monthly", isActive: true }],
      },
      "communitySubscriptions/s1": {
        id: "s1",
        userId: "supporter-1",
        tierId: "t1",
        creatorHandle: "alice",
      },
    };

    const resolved = await resolvePayment(
      env,
      body({
        creatorHandle: "alice",
        type: "community",
        communityTierId: "t1",
        communitySubscriptionId: "s1",
        communityInterval: "monthly",
        currency: "RWF",
      }),
      "supporter-1",
      makeRepo(docs),
    );

    expect(resolved.totalAmount).toBe(5000);
  });

  it("exposes typed request errors", () => {
    const err = new PaymentRequestError("X", "nope", 422);
    expect(err.code).toBe("X");
    expect(err.statusCode).toBe(422);
  });
});
