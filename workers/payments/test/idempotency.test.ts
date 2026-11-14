import { describe, expect, it } from "vitest";
import {
  hashRequest,
  normalizeIdempotencyKey,
} from "../src/services/idempotency";

describe("idempotency keys", () => {
  it("accepts well-formed keys", () => {
    expect(normalizeIdempotencyKey("retry_abc-123.4")).toBe("retry_abc-123.4");
    expect(normalizeIdempotencyKey("  auto:12345678  ")).toBe("auto:12345678");
  });

  it("rejects missing, short and unsafe keys", () => {
    expect(normalizeIdempotencyKey("")).toBe("");
    expect(normalizeIdempotencyKey(undefined)).toBe("");
    expect(() => normalizeIdempotencyKey("short")).toThrow(
      /Idempotency-Key/,
    );
    expect(() => normalizeIdempotencyKey("bad key with spaces")).toThrow(
      /Idempotency-Key/,
    );
    expect(() => normalizeIdempotencyKey("bad/key")).toThrow(/Idempotency-Key/);
  });

  it("hashes the same logical request deterministically", async () => {
    const a = await hashRequest({ amount: 1000, uid: "u1", type: "support" });
    const b = await hashRequest({ type: "support", uid: "u1", amount: 1000 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the hash when a monetary or identity field changes", async () => {
    const base = await hashRequest({ amount: 1000, uid: "u1", type: "support" });
    const amount = await hashRequest({ amount: 2000, uid: "u1", type: "support" });
    const uid = await hashRequest({ amount: 1000, uid: "u2", type: "support" });
    expect(amount).not.toBe(base);
    expect(uid).not.toBe(base);
  });
});
