import { describe, expect, it } from "vitest";
import { buildPayoutOverview } from "@/lib/payouts/overview";

describe("payout overview", () => {
  it("uses configured thresholds without a 10000 fallback", () => {
    const overview = buildPayoutOverview(
      {
        currency: "RWF",
        pendingPayout: 15000,
        pendingPayoutUSD: 25.5,
        totalEarnings: 40000,
        totalEarningsUSD: 80,
        pendingWithdrawals: { RWF: 5000 },
      },
      [
        { code: "RWF", payoutThreshold: 10000 },
        { code: "USD", payoutThreshold: 20 },
      ],
    );

    expect(overview.creatorCurrency).toBe("RWF");
    expect(overview.withdrawThreshold).toBe(10000);
    expect(overview.perCurrencyBalances).toEqual([
      { currency: "RWF", pending: 10000, threshold: 10000, earnings: 40000 },
      { currency: "USD", pending: 25.5, threshold: 20, earnings: 80 },
    ]);
  });

  it("includes funded dynamic currencies and omits unfunded non-default currencies", () => {
    const overview = buildPayoutOverview(
      { currency: "USD", pendingPayoutUSD: 50, pendingPayoutKES: 200, totalEarningsKES: 500 },
      [
        { code: "RWF", payoutThreshold: 10000 },
        { code: "EUR", payoutThreshold: 20 },
      ],
    );

    expect(overview.creatorCurrency).toBe("USD");
    expect(overview.withdrawThreshold).toBeNull();
    expect(overview.perCurrencyBalances).toEqual([
      { currency: "USD", pending: 50, threshold: null, earnings: 0 },
      { currency: "KES", pending: 200, threshold: null, earnings: 500 },
    ]);
  });

  it("omits non-default zero-balance currencies even when zero fields exist on creator", () => {
    const overview = buildPayoutOverview(
      {
        currency: "RWF",
        pendingPayout: 0,
        pendingPayoutUSD: 0,
        totalEarningsUSD: 0,
        pendingPayoutKES: 1500,
      },
      [
        { code: "RWF", payoutThreshold: 10000 },
        { code: "USD", payoutThreshold: 20 },
        { code: "KES", payoutThreshold: 1000 },
      ],
    );

    expect(overview.perCurrencyBalances.map((b) => b.currency)).toEqual(["RWF", "KES"]);
  });

  it("does not invent a withdrawal threshold when configuration is missing", () => {
    const overview = buildPayoutOverview({ currency: "USD", pendingPayoutUSD: 50 }, [
      { code: "RWF", payoutThreshold: 10000 },
    ]);

    expect(overview.perCurrencyBalances[0]).toEqual({
      currency: "USD",
      pending: 50,
      threshold: null,
      earnings: 0,
    });
  });

  it("rejects malformed balances instead of surfacing NaN", () => {
    const overview = buildPayoutOverview(
      { currency: "RWF", pendingPayout: "not-a-number", pendingWithdrawals: {} },
      [{ code: "RWF", payoutThreshold: 10000 }],
    );

    expect(overview.perCurrencyBalances[0].pending).toBe(0);
  });
});
