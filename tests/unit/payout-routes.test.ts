import { describe, expect, it } from "vitest";
import { PayoutRouteError, resolvePayoutRoute } from "@/lib/payouts/rails";

describe("payout routes", () => {
  it("defaults RWF to mobile money and USD to bank transfer", () => {
    expect(resolvePayoutRoute("RWF")).toEqual({
      currency: "RWF",
      provider: "manual",
      rail: "mobile_money",
    });
    expect(resolvePayoutRoute("usd")).toEqual({
      currency: "USD",
      provider: "manual",
      rail: "bank_transfer",
    });
  });

  it("uses the creator preference for supported RWF rails", () => {
    expect(resolvePayoutRoute("RWF", { payoutPreference: "bank" }).rail).toBe(
      "bank_transfer",
    );
    expect(resolvePayoutRoute("RWF", { payoutPreference: "Airtel" }).rail).toBe(
      "mobile_money",
    );  
  });

  it("allows a configured route to override the default", () => {
    expect(resolvePayoutRoute("RWF", { rail: "bank_transfer" }).rail).toBe(
      "bank_transfer",
    );
  });

  it("rejects unknown providers and non-bank USD routes", () => {
    expect(() => resolvePayoutRoute("RWF", { provider: "unknown" })).toThrowError(
      PayoutRouteError,
    );
    expect(() => resolvePayoutRoute("USD", { rail: "mobile_money" })).toThrowError(
      "USD payouts must use a bank transfer rail",
    );
    expect(() => resolvePayoutRoute("USD", { payoutPreference: "momo" })).not.toThrow();
  });
});
