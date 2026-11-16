import { describe, expect, it } from "vitest";
import {
  normalizePayoutCurrency,
  parsePayoutCurrency,
  PAYOUT_CURRENCIES,
  pendingPayoutField,
} from "@/lib/payouts/currency";

describe("payout currency fields", () => {
  it("keeps payout support separate from the checkout catalog", () => {
    expect(PAYOUT_CURRENCIES).toEqual(["RWF", "USD"]);
    expect(normalizePayoutCurrency(" usd ")).toBe("USD");
    expect(normalizePayoutCurrency("EUR")).toBeNull();
  });

  it("normalizes supported withdraw currencies", () => {
    expect(parsePayoutCurrency("usd")).toBe("USD");
    expect(parsePayoutCurrency(" RWF ")).toBe("RWF");
  });

  it("rejects missing or unsupported withdraw currencies", () => {
    expect(() => parsePayoutCurrency(undefined)).toThrow();
    expect(() => parsePayoutCurrency("EUR")).toThrow();
  });

  it("debits the matching balance field", () => {
    expect(pendingPayoutField("USD")).toBe("pendingPayoutUSD");
    expect(pendingPayoutField("RWF")).toBe("pendingPayout");
  });
});
