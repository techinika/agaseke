import { describe, expect, it } from "vitest";
import {
  mapPaypackStatus,
  mapPesapalStatus,
  verifyPaypackEvent,
  verifyPaypackSignature,
  verifyPesapalStatus,
} from "../src/services/webhookVerify";

async function sign(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const binary = Array.from(new Uint8Array(digest))
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary);
}

describe("paypack signature verification", () => {
  const body = JSON.stringify({ data: { ref: "ref-1", status: "successful" } });
  const secret = "test-webhook-secret";

  it("accepts a valid base64 HMAC-SHA256 signature", async () => {
    const signature = await sign(body, secret);
    await expect(
      verifyPaypackSignature(body, secret, signature),
    ).resolves.toBe(true);
  });

  it("rejects a missing signature", async () => {
    await expect(
      verifyPaypackSignature(body, secret, null),
    ).resolves.toBe(false);
    await expect(
      verifyPaypackSignature(body, secret, ""),
    ).resolves.toBe(false);
  });

  it("rejects a wrong signature or wrong secret", async () => {
    const signature = await sign(body, secret);
    await expect(
      verifyPaypackSignature(`${body} `, secret, signature),
    ).resolves.toBe(false);
    await expect(
      verifyPaypackSignature(body, "other-secret", signature),
    ).resolves.toBe(false);
    await expect(
      verifyPaypackSignature(body, secret, `${signature}x`),
    ).resolves.toBe(false);
  });

  it("rejects when no webhook secret is configured", async () => {
    const signature = await sign(body, secret);
    await expect(
      verifyPaypackSignature(body, "", signature),
    ).resolves.toBe(false);
  });
});

const stored = {
  ref: "AGS-CARD-abc",
  amount: 10000,
  currency: "RWF",
  orderTrackingId: "track-1",
};

describe("paypack webhook verification", () => {
  it("maps provider statuses", () => {
    expect(mapPaypackStatus("successful")).toBe("successful");
    expect(mapPaypackStatus("completed")).toBe("successful");
    expect(mapPaypackStatus("failed")).toBe("failed");
    expect(mapPaypackStatus("pending")).toBe("pending");
    expect(mapPaypackStatus("what")).toBe("unknown");
  });

  it("accepts a matching event", () => {
    const result = verifyPaypackEvent(
      { ref: "ref-1", status: "successful", amount: 10000, currency: "RWF" },
      { ref: "ref-1", amount: 10000, currency: "RWF" },
    );
    expect(result.state).toBe("successful");
    expect(result.amount).toBe(10000);
  });

  it("rejects amount, currency and reference mismatches", () => {
    expect(() =>
      verifyPaypackEvent(
        { ref: "ref-1", status: "successful", amount: 1, currency: "RWF" },
        { ref: "ref-1", amount: 10000, currency: "RWF" },
      ),
    ).toThrow(/amount/i);

    expect(() =>
      verifyPaypackEvent(
        { ref: "ref-1", status: "successful", amount: 10000, currency: "USD" },
        { ref: "ref-1", amount: 10000, currency: "RWF" },
      ),
    ).toThrow(/currency/i);

    expect(() =>
      verifyPaypackEvent(
        { ref: "ref-2", status: "successful", amount: 10000, currency: "RWF" },
        { ref: "ref-1", amount: 10000, currency: "RWF" },
      ),
    ).toThrow(/reference/i);
  });
});

describe("pesapal status verification", () => {
  it("maps provider statuses", () => {
    expect(mapPesapalStatus("Completed")).toBe("successful");
    expect(mapPesapalStatus("Failed")).toBe("failed");
    expect(mapPesapalStatus("Invalid")).toBe("failed");
    expect(mapPesapalStatus("Reversed")).toBe("failed");
    expect(mapPesapalStatus("Pending")).toBe("pending");
    expect(mapPesapalStatus(undefined, 1)).toBe("successful");
    expect(mapPesapalStatus(undefined, 0)).toBe("failed");
    expect(mapPesapalStatus(undefined, 2)).toBe("failed");
    expect(mapPesapalStatus(undefined, 3)).toBe("failed");
    expect(mapPesapalStatus("Unknown")).toBe("unknown");
  });

  it("accepts a matching status and binds the tracking id", () => {
    const result = verifyPesapalStatus({
      bodyTrackingId: "track-new",
      bodyMerchantReference: "AGS-CARD-abc",
      stored: { ref: "AGS-CARD-abc", amount: 10000, currency: "RWF" },
      status: {
        merchant_reference: "AGS-CARD-abc",
        order_tracking_id: "track-new",
        amount: 10000,
        currency: "RWF",
        payment_status_description: "Completed",
      },
    });

    expect(result.state).toBe("successful");
    expect(result.bindTrackingId).toBe(true);
  });

  it("rejects a mismatched merchant reference", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-1",
        bodyMerchantReference: "AGS-CARD-abc",
        stored,
        status: {
          merchant_reference: "AGS-CARD-other",
          amount: 10000,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/merchant reference/i);
  });

  it("rejects a mismatched tracking id", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-other",
        bodyMerchantReference: "AGS-CARD-abc",
        stored,
        status: {
          merchant_reference: "AGS-CARD-abc",
          order_tracking_id: "track-other",
          amount: 10000,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/tracking/i);
  });

  it("rejects an amount mismatch", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-1",
        bodyMerchantReference: "AGS-CARD-abc",
        stored,
        status: {
          merchant_reference: "AGS-CARD-abc",
          amount: 5,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/amount/i);
  });

  it("rejects a currency mismatch", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-1",
        bodyMerchantReference: "AGS-CARD-abc",
        stored,
        status: {
          merchant_reference: "AGS-CARD-abc",
          amount: 10000,
          currency: "USD",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/currency/i);
  });

  it("rejects a first-seen body tracking id that differs from the stored one", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-other",
        bodyMerchantReference: "AGS-CARD-abc",
        stored: {
          ref: "AGS-CARD-abc",
          amount: 10000,
          currency: "RWF",
          orderTrackingId: "track-1",
        },
        status: {
          merchant_reference: "AGS-CARD-abc",
          amount: 10000,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/tracking/i);
  });

  it("rejects when the body reference does not match the stored transaction", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-1",
        bodyMerchantReference: "AGS-CARD-other",
        stored,
        status: {
          merchant_reference: "AGS-CARD-other",
          amount: 10000,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/merchant reference/i);
  });

  it("rejects a status response without a merchant reference", () => {
    expect(() =>
      verifyPesapalStatus({
        bodyTrackingId: "track-1",
        bodyMerchantReference: "AGS-CARD-abc",
        stored,
        status: {
          amount: 10000,
          currency: "RWF",
          payment_status_description: "Completed",
        },
      }),
    ).toThrow(/merchant reference/i);
  });
});
