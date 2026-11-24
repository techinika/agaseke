import { describe, expect, it } from "vitest";
import {
  PRE_MULTI_CURRENCY_CUTOFF_ISO,
  PRE_MULTI_CURRENCY_CUTOFF_MS,
  getRecordTimestampMs,
  normalizeValidCurrency,
  parseTimestampMs,
  resolveHistoricalCurrency,
} from "@/lib/money/historicalCurrency";

describe("historicalCurrency resolver", () => {
  it("uses 2026-12-01T00:00:00.000Z as the pre-multi-currency cutoff", () => {
    expect(PRE_MULTI_CURRENCY_CUTOFF_ISO).toBe("2026-12-01T00:00:00.000Z");
    expect(PRE_MULTI_CURRENCY_CUTOFF_MS).toBe(Date.parse("2026-12-01T00:00:00.000Z"));
  });

  it("ALWAYS preserves explicit valid currencies (including USD) even on pre-cutoff records", () => {
    expect(
      resolveHistoricalCurrency({
        currency: "usd",
        createdAt: "2025-04-10T12:00:00.000Z",
      }),
    ).toBe("USD");

    expect(
      resolveHistoricalCurrency({
        currency: "EUR",
        createdAt: "2024-01-01T00:00:00.000Z",
      }),
    ).toBe("EUR");

    expect(
      resolveHistoricalCurrency({
        payoutCurrency: "USD",
        createdAt: "2026-06-15T10:00:00.000Z",
      }),
    ).toBe("USD");

    expect(
      resolveHistoricalCurrency({
        chargeCurrency: "KES",
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe("KES");
  });

  it("defaults missing currency to RWF for pre-Dec-2026 and untimestamped records", () => {
    expect(
      resolveHistoricalCurrency({
        amount: 5000,
        createdAt: "2026-11-30T23:59:59.999Z",
      }),
    ).toBe("RWF");

    expect(
      resolveHistoricalCurrency({
        amount: 5000,
        successfulAt: { seconds: Math.floor(Date.parse("2026-05-01T00:00:00Z") / 1000) },
      }),
    ).toBe("RWF");

    expect(
      resolveHistoricalCurrency({
        amount: 5000,
      }),
    ).toBe("RWF");

    expect(resolveHistoricalCurrency(null)).toBe("RWF");
  });

  it("returns empty string (or explicit fallbackCurrency) for post-cutoff records missing currency", () => {
    expect(
      resolveHistoricalCurrency({
        amount: 50,
        createdAt: "2026-12-01T00:00:00.000Z",
      }),
    ).toBe("");

    expect(
      resolveHistoricalCurrency(
        {
          amount: 50,
          createdAt: "2026-12-15T09:00:00.000Z",
        },
        { fallbackCurrency: "USD" },
      ),
    ).toBe("USD");
  });

  it("supports Firestore Timestamp-like objects, Dates, numbers, and ISO strings", () => {
    const iso = "2026-07-04T15:30:00.000Z";
    const expected = Date.parse(iso);

    expect(parseTimestampMs(iso)).toBe(expected);
    expect(parseTimestampMs(new Date(expected))).toBe(expected);
    expect(parseTimestampMs(expected)).toBe(expected);
    expect(parseTimestampMs({ toMillis: () => expected })).toBe(expected);
    expect(parseTimestampMs({ toDate: () => new Date(expected) })).toBe(expected);
    expect(parseTimestampMs({ seconds: Math.floor(expected / 1000) })).toBe(expected);
    expect(parseTimestampMs({ _seconds: Math.floor(expected / 1000) })).toBe(expected);

    expect(
      getRecordTimestampMs({
        appliedAt: iso,
      }),
    ).toBe(expected);

    expect(normalizeValidCurrency("usd")).toBe("USD");
    expect(normalizeValidCurrency("INVALID")).toBe("");
    expect(normalizeValidCurrency(null)).toBe("");
  });
});
