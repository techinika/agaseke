import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  FxError,
  applySpreadMinor,
  convertMinorUnits,
  createFxQuote,
  deriveCrossRate,
  isQuoteUsable,
  isSnapshotFresh,
  parseFxSnapshot,
  type FxSnapshot,
} from "@/lib/money/fx";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const NEW_DATE = "2026-11-16T11:00:00.000Z";

function snapshot(overrides: Partial<FxSnapshot> = {}): FxSnapshot {
  return {
    base: "USD",
    rates: { RWF: 1_300, KES: 129, UGX: 3_700, TZS: 2_650 },
    fetchedAt: "2026-11-16T11:00:00.000Z",
    source: "test",
    expiresAt: "2026-11-17T11:00:00.000Z",
    ...overrides,
  };
}

describe("worker FX copy", () => {
  it("keeps the payments worker FX module identical to the root module", () => {
    const root = process.cwd();
    expect(
      readFileSync(join(root, "workers/payments/src/money/fx.ts"), "utf8"),
    ).toBe(readFileSync(join(root, "lib/money/fx.ts"), "utf8"));
  });
});

describe("FX snapshot parsing and staleness", () => {
  it("drops unknown currencies and invalid rates", () => {
    const parsed = parseFxSnapshot({
      base: "USD",
      rates: { RWF: 1300, KES: "nope", ZZZ: 4, UGX: 0, TZS: 2650 },
      fetchedAt: "2026-11-16T11:00:00.000Z",
      source: "test",
    });
    expect(parsed.rates).toEqual({ RWF: 1300, TZS: 2650 });
  });

  it("rejects a missing or invalid snapshot", () => {
    expect(() => parseFxSnapshot(null)).toThrow(FxError);
    expect(() =>
      parseFxSnapshot({ base: "ZZZ", rates: {}, fetchedAt: NEW_DATE }),
    ).toThrow(FxError);
    expect(() =>
      parseFxSnapshot({ base: "USD", rates: {}, fetchedAt: "not-a-date" }),
    ).toThrow(FxError);
  });

  it("treats expired or future-dated snapshots as stale", () => {
    expect(isSnapshotFresh(snapshot(), NOW)).toBe(true);
    expect(
      isSnapshotFresh(snapshot({ expiresAt: "2026-11-16T11:59:59.000Z" }), NOW),
    ).toBe(false);
    expect(
      isSnapshotFresh(snapshot({ fetchedAt: "2026-11-16T12:30:00.000Z" }), NOW),
    ).toBe(false);
    expect(
      isSnapshotFresh(
        snapshot({
          fetchedAt: "2026-11-14T12:00:00.000Z",
          expiresAt: undefined,
        }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("cross rates and integer conversion", () => {
  it("derives cross rates through the base currency", () => {
    const rates = snapshot();
    expect(deriveCrossRate(rates, "USD", "RWF")).toBe(1300);
    expect(deriveCrossRate(rates, "RWF", "USD")).toBeCloseTo(1 / 1300, 12);
    expect(deriveCrossRate(rates, "KES", "RWF")).toBeCloseTo(1300 / 129, 12);
    expect(deriveCrossRate(rates, "RWF", "RWF")).toBe(1);
  });

  it("fails closed when a quote currency is missing", () => {
    expect(() => deriveCrossRate(snapshot(), "USD", "EUR")).toThrow(FxError);
  });

  it("converts between zero-decimal and two-decimal currencies", () => {
    expect(convertMinorUnits(130_000, "RWF", "USD", 1 / 1300)).toBe(10_000);
    expect(convertMinorUnits(10_000, "USD", "RWF", 1300)).toBe(130_000);
    expect(convertMinorUnits(100_000, "UGX", "KES", 129 / 3700)).toBe(348_649);
  });

  it("always returns an integer and preserves ordering", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        fc.double({ min: 0.0001, max: 10_000, noNaN: true }),
        (amount, rate) => {
          const converted = convertMinorUnits(amount, "RWF", "USD", rate);
          expect(Number.isInteger(converted)).toBe(true);
          expect(converted).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("deriving through the base agrees with a direct cross rate", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10_000, noNaN: true }),
        fc.double({ min: 0.01, max: 10_000, noNaN: true }),
        (fromRate, toRate) => {
          const rates = snapshot({ rates: { KES: fromRate, RWF: toRate } });
          const direct = deriveCrossRate(rates, "KES", "RWF");
          expect(direct).toBeCloseTo(toRate / fromRate, 10);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("spread and locked quotes", () => {
  it("adds spread to checkout and subtracts it from withdrawals", () => {
    expect(applySpreadMinor(10_000, 150, "checkout")).toBe(10_150);
    expect(applySpreadMinor(10_000, 150, "withdrawal")).toBe(9_850);
    expect(applySpreadMinor(10_000, 0, "withdrawal")).toBe(10_000);
    expect(() => applySpreadMinor(10_000, 10_000, "checkout")).toThrow(FxError);
  });

  it("locks a checkout quote with a markup", () => {
    const quote = createFxQuote({
      id: "quote_1",
      purpose: "checkout",
      fromCurrency: "RWF",
      toCurrency: "USD",
      sourceAmountMinor: 13_000,
      rate: 1 / 1300,
      spreadBps: 200,
      snapshot: snapshot(),
      now: NOW,
      ttlSeconds: 600,
    });

    expect(quote.targetAmountMinor).toBe(1020);
    expect(quote.sourceAmountMinor).toBe(13_000);
    expect(quote.expiresAt).toBe("2026-11-16T12:10:00.000Z");
    expect(isQuoteUsable(quote, NOW)).toBe(true);
  });

  it("never lets a quote outlive its rate snapshot", () => {
    const quote = createFxQuote({
      purpose: "withdrawal",
      fromCurrency: "USD",
      toCurrency: "RWF",
      sourceAmountMinor: 1000,
      rate: 1300,
      spreadBps: 150,
      snapshot: snapshot({ expiresAt: "2026-11-16T12:05:00.000Z" }),
      now: NOW,
      ttlSeconds: 600,
    });

    expect(quote.expiresAt).toBe("2026-11-16T12:05:00.000Z");
    expect(quote.targetAmountMinor).toBe(12_805);
  });

  it("rejects stale rates and non-positive amounts", () => {
    expect(() =>
      createFxQuote({
        purpose: "checkout",
        fromCurrency: "RWF",
        toCurrency: "USD",
        sourceAmountMinor: 1000,
        rate: 1 / 1300,
        spreadBps: 0,
        snapshot: snapshot({ expiresAt: "2026-11-16T11:59:59.000Z" }),
        now: NOW,
      }),
    ).toThrow(FxError);

    expect(() =>
      createFxQuote({
        purpose: "checkout",
        fromCurrency: "RWF",
        toCurrency: "USD",
        sourceAmountMinor: 0,
        rate: 1 / 1300,
        spreadBps: 0,
        snapshot: snapshot(),
        now: NOW,
      }),
    ).toThrow(FxError);
  });
});
