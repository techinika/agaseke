import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("firebase-test-token"),
    },
  },
}));

describe("paymentsService CORS-safe initiation", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy);
    fetchSpy.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends idempotencyKey in the JSON body without a custom Idempotency-Key HTTP header for MoMo", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ ref: "momo-ref-1" }), { status: 200 }),
    );

    const { initiateMomoPayment } = await import("@/lib/paymentsService");
    const result = await initiateMomoPayment(
      {
        type: "gathering",
        creatorHandle: "agaseke",
        gatheringId: "g-1",
        phone: "250788000000",
        currency: "RWF",
      },
      "idem-momo-1234",
    );

    expect(result).toEqual({ ref: "momo-ref-1" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer firebase-test-token");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toBeUndefined();
    expect(headers["idempotency-key"]).toBeUndefined();
    expect(JSON.parse(init.body as string)).toMatchObject({
      type: "gathering",
      idempotencyKey: "idem-momo-1234",
    });
  });

  it("sends idempotencyKey in the JSON body without a custom Idempotency-Key HTTP header for Card", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ref: "card-ref-1",
          merchant_reference: "card-ref-1",
          redirect_url: "https://pay.example.com/checkout",
        }),
        { status: 200 },
      ),
    );

    const { initiateCardPayment } = await import("@/lib/paymentsService");
    const result = await initiateCardPayment(
      {
        type: "gathering",
        creatorHandle: "agaseke",
        gatheringId: "g-1",
        currency: "RWF",
        idempotencyKey: "idem-card-5678",
      },
    );

    expect(result.ref).toBe("card-ref-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer firebase-test-token");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toBeUndefined();
    expect(headers["idempotency-key"]).toBeUndefined();
    expect(JSON.parse(init.body as string)).toMatchObject({
      type: "gathering",
      idempotencyKey: "idem-card-5678",
    });
  });
});
