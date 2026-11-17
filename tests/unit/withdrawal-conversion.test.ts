import { describe, expect, it } from "vitest";
import { planWithdrawalConversion } from "@/lib/payouts/withdrawalConversion";
import type { FxSnapshot } from "@/lib/money";

const NOW = new Date("2026-01-01T00:00:00Z");
const snapshot: FxSnapshot = {
  base: "USD",
  rates: { USD: 1, RWF: 1300, EUR: 0.9 },
  fetchedAt: NOW.toISOString(),
  source: "test",
};

describe("withdrawal conversion planning", () => {
  it("uses same-currency balance without FX", () => {
    const plan = planWithdrawalConversion({
      creatorUid: "u1",
      creatorHandle: "alice",
      payoutCurrency: "RWF",
      requestedPayoutAmountMinor: 1300, // RWF has minorUnit 0
      availableMinorByCurrency: { RWF: 2000 },
      snapshot,
      spreadBps: 150,
      now: NOW,
    });

    expect(plan.sources).toHaveLength(1);
    expect(plan.sources[0].currency).toBe("RWF");
    expect(plan.sources[0].amountMinor).toBe(1300);
    expect(plan.sources[0].payoutAmountMinor).toBe(1300);
    expect(plan.sources[0].effectiveRate).toBe(1);
    expect(plan.sources[0].fxRateId).toBe("");
  });

  it("converts from a non-payout currency with spread and locks quote metadata", () => {
    // USD minorUnit 2, RWF minorUnit 0. $1.00 = 100 minor. 1 USD -> 1300 RWF base, 1287 with 1% spread.
    const plan = planWithdrawalConversion({
      creatorUid: "u1",
      creatorHandle: "alice",
      payoutCurrency: "RWF",
      requestedPayoutAmountMinor: 1280,
      availableMinorByCurrency: { USD: 200 }, // $2.00
      snapshot,
      spreadBps: 100, // 1%
      now: NOW,
    });

    expect(plan.sources).toHaveLength(1);
    const s = plan.sources[0];
    expect(s.currency).toBe("USD");
    expect(s.fxRateId).toBeTruthy();
    expect(s.rateSource).toBe("test");
    expect(s.spreadBps).toBe(100);
    expect(s.payoutAmountMinor).toBeGreaterThanOrEqual(1280);
    expect(s.amountMinor).toBeGreaterThan(0);
    expect(s.amountMinor).toBeLessThanOrEqual(200);
  });

  it("combines same-currency and converted sources in stable order", () => {
    const plan = planWithdrawalConversion({
      creatorUid: "u1",
      creatorHandle: "alice",
      payoutCurrency: "RWF",
      requestedPayoutAmountMinor: 1500,
      availableMinorByCurrency: { RWF: 500, USD: 500 }, // 500 RWF + $5.00
      snapshot,
      spreadBps: 150,
      now: NOW,
    });

    expect(plan.sources[0].currency).toBe("RWF");
    expect(plan.sources[0].amountMinor).toBe(500);
    expect(plan.sources.some((s) => s.currency === "USD")).toBe(true);
    const totalPayout = plan.sources.reduce((n, s) => n + s.payoutAmountMinor, 0);
    expect(totalPayout).toBeGreaterThanOrEqual(1500);
  });

  it("fails when available balances cannot satisfy requested payout", () => {
    expect(() =>
      planWithdrawalConversion({
        creatorUid: "u1",
        creatorHandle: "alice",
        payoutCurrency: "RWF",
        requestedPayoutAmountMinor: 5000,
        availableMinorByCurrency: { RWF: 100 },
        snapshot,
        spreadBps: 150,
        now: NOW,
      }),
    ).toThrow(/Insufficient available balance/);
  });
});
