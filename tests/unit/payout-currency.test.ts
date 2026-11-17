import { describe, expect, it } from "vitest";
import {
  normalizePayoutCurrency,
  parsePayoutCurrency,
  PAYOUT_CURRENCIES,
  pendingPayoutField,
} from "@/lib/payouts/currency";

describe("payout currency fields", () => {
  it("recognizes registry currencies for payout parsing", () => {
    expect(PAYOUT_CURRENCIES).toContain("RWF");
    expect(PAYOUT_CURRENCIES).toContain("USD");
    expect(normalizePayoutCurrency(" usd ")).toBe("USD");
    expect(normalizePayoutCurrency("eur")).toBe("EUR");
    expect(normalizePayoutCurrency("ZZZ")).toBeNull();
  });

  it("normalizes supported withdraw currencies", () => {
    expect(parsePayoutCurrency("usd")).toBe("USD");
    expect(parsePayoutCurrency(" RWF ")).toBe("RWF");
    expect(parsePayoutCurrency("kes")).toBe("KES");
  });

  it("rejects missing or unknown withdraw currencies", () => {
    expect(() => parsePayoutCurrency(undefined)).toThrow();
    expect(() => parsePayoutCurrency("ZZZ")).toThrow();
  });

  it("debits the matching balance field", () => {
    expect(pendingPayoutField("USD")).toBe("pendingPayoutUSD");
    expect(pendingPayoutField("RWF")).toBe("pendingPayout");
    expect(pendingPayoutField("KES")).toBe("pendingPayoutKES");
  });
});
