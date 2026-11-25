import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import {
  CURRENCIES,
  CURRENCY_CODES,
  getCurrencyDefinition,
  isCurrencyCode,
} from "@/lib/money/registry.generated";
import {
  MoneyError,
  add,
  allocate,
  allocateByBps,
  compare,
  equals,
  formatMoney,
  fromMajor,
  money,
  negate,
  parseAmountToMinor,
  subtract,
  sumMoney,
  toMajorString,
} from "@/lib/money/money";
import { convertForDisplay, formatDisplayAmount, type FxRate } from "@/lib/money/display";
import {
  CURRENCY_API_SOURCE,
  DEFAULT_RATE_SOURCES,
  FRANKFURTER_API_SOURCE,
  FxRateError,
  OPEN_ER_API_SOURCE,
  fetchDailyRates,
} from "@/lib/money/rateSources";

const NOW = new Date("2026-11-15T12:00:00.000Z");

describe("currency registry", () => {
  it("contains the launch and catalog currencies with correct ISO minor units", () => {
    expect(CURRENCY_CODES).toEqual(
      expect.arrayContaining([
        "RWF",
        "USD",
        "KES",
        "UGX",
        "TZS",
        "NGN",
        "GHS",
        "ZAR",
        "XOF",
        "XAF",
        "GBP",
        "EUR",
        "CAD",
        "CNY",
        "JPY",
      ]),
    );
    expect(CURRENCY_CODES).toHaveLength(53);
    expect(CURRENCIES.RWF.minorUnit).toBe(0);
    expect(CURRENCIES.USD.minorUnit).toBe(2);
    expect(CURRENCIES.KES.minorUnit).toBe(2);
    expect(CURRENCIES.UGX.minorUnit).toBe(0);
    expect(CURRENCIES.TZS.minorUnit).toBe(2);
    expect(CURRENCIES.XOF.minorUnit).toBe(0);
    expect(CURRENCIES.TND.minorUnit).toBe(3);
    expect(CURRENCIES.JPY.minorUnit).toBe(0);
    expect(CURRENCIES.GBP.minorUnit).toBe(2);
    expect(isCurrencyCode("RWF")).toBe(true);
    expect(isCurrencyCode("rwf")).toBe(false);
    expect(isCurrencyCode("EUR")).toBe(true);
  });

  it("never accepts an unknown currency", () => {
    expect(() => money("ZZZ" as never, 100)).toThrow(MoneyError);
    expect(() => fromMajor("ZZZ" as never, 1)).toThrow(MoneyError);
  });
});

describe("exact major/minor conversion", () => {
  it("converts whole-number currencies without fractions", () => {
    expect(fromMajor("RWF", "1000")).toEqual(money("RWF", 1000));
    expect(fromMajor("UGX", 100)).toEqual(money("UGX", 100));
    expect(toMajorString(money("RWF", 1234))).toBe("1234");
  });

  it("converts two-decimal currencies exactly", () => {
    expect(fromMajor("USD", "1.5")).toEqual(money("USD", 150));
    expect(fromMajor("KES", "0.01")).toEqual(money("KES", 1));
    expect(fromMajor("TZS", "-2.34")).toEqual(money("TZS", -234));
    expect(fromMajor("GBP", "1.5")).toEqual(money("GBP", 150));
    expect(fromMajor("CNY", "1.5")).toEqual(money("CNY", 150));
    expect(toMajorString(money("USD", 150))).toBe("1.50");
  });

  it("converts three-decimal currencies exactly", () => {
    expect(fromMajor("TND", "1.234")).toEqual(money("TND", 1234));
    expect(fromMajor("LYD", "0.001")).toEqual(money("LYD", 1));
    expect(toMajorString(money("TND", 1234))).toBe("1.234");
  });

  it("rejects fractional minor units instead of rounding", () => {
    expect(() => fromMajor("RWF", "1.5")).toThrow(MoneyError);
    expect(() => fromMajor("USD", "1.005")).toThrow(MoneyError);
    expect(() => fromMajor("USD", "1e3")).toThrow(MoneyError);
    expect(() => fromMajor("USD", "1.2.3")).toThrow(MoneyError);
  });

  it("parses common user input without losing minor units", () => {
    expect(parseAmountToMinor("1,000 RWF", "RWF")).toEqual(money("RWF", 1000));
    expect(parseAmountToMinor("USD 1,000.50", "USD")).toEqual(money("USD", 100050));
    expect(parseAmountToMinor("1,50", "USD")).toEqual(money("USD", 150));
    expect(parseAmountToMinor("1 000", "USD")).toEqual(money("USD", 100000));
    expect(parseAmountToMinor(".5", "USD")).toEqual(money("USD", 50));
  });

  it("rejects ambiguous or malicious input", () => {
    expect(() => parseAmountToMinor("-5", "USD")).toThrow(MoneyError);
    expect(() => parseAmountToMinor("1e3", "USD")).toThrow(MoneyError);
    expect(() => parseAmountToMinor("12abc", "USD")).toThrow(MoneyError);
    expect(() => parseAmountToMinor("1.2.3", "USD")).toThrow(MoneyError);
    expect(() => parseAmountToMinor("", "USD")).toThrow(MoneyError);
  });

  it("formats each currency with its own minor unit", () => {
    expect(formatMoney(money("RWF", 1000))).toBe("1,000 RWF");
    expect(formatMoney(money("USD", 150))).toBe("1.50 USD");
    expect(formatMoney(money("UGX", 1000))).toBe("1,000 UGX");
    expect(formatMoney(money("TZS", 1))).toBe("0.01 TZS");
  });

  it("round-trips every minor amount through its exact major string", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CURRENCY_CODES),
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        (currency, amountMinor) => {
          const value = money(currency, amountMinor);
          expect(fromMajor(currency, toMajorString(value))).toEqual(value);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("integer arithmetic", () => {
  it("adds, subtracts and compares within one currency", () => {
    expect(add(money("USD", 150), money("USD", 25))).toEqual(money("USD", 175));
    expect(subtract(money("USD", 150), money("USD", 25))).toEqual(money("USD", 125));
    expect(negate(money("KES", 1))).toEqual(money("KES", -1));
    expect(compare(money("RWF", 1), money("RWF", 2))).toBe(-1);
    expect(equals(money("RWF", 1), money("RWF", 1))).toBe(true);
    expect(sumMoney([money("UGX", 1), money("UGX", 2)])).toEqual(money("UGX", 3));
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money("RWF", 1), money("USD", 1))).toThrow(MoneyError);
    expect(() => compare(money("RWF", 1), money("USD", 1))).toThrow(MoneyError);
  });

  it("refuses unsafe total amounts", () => {
    const value = money("USD", Number.MAX_SAFE_INTEGER);
    expect(() => add(value, money("USD", 1))).toThrow(MoneyError);
  });
});

describe("largest-remainder allocation", () => {
  it("conserves the total and handles remainders deterministically", () => {
    expect(allocate(money("USD", 100), [1, 1, 1])).toEqual([
      money("USD", 34),
      money("USD", 33),
      money("USD", 33),
    ]);
    expect(allocate(money("RWF", 100), [0, 1, 0])).toEqual([
      money("RWF", 0),
      money("RWF", 100),
      money("RWF", 0),
    ]);
  });

  it("supports basis-point fee splits", () => {
    expect(allocateByBps(money("USD", 100), [1000, 9000])).toEqual([
      money("USD", 10),
      money("USD", 90),
    ]);
    expect(allocateByBps(money("USD", 100), [900, 9000, 100])).toEqual([
      money("USD", 9),
      money("USD", 90),
      money("USD", 1),
    ]);
  });

  it("rejects invalid weights and negative totals", () => {
    expect(() => allocate(money("USD", 100), [])).toThrow(MoneyError);
    expect(() => allocate(money("USD", 100), [0, 0])).toThrow(MoneyError);
    expect(() => allocate(money("USD", 100), [-1, 2])).toThrow(MoneyError);
    expect(() => allocate(money("USD", -1), [1])).toThrow(MoneyError);
    expect(() => allocateByBps(money("USD", 100), [1000])).toThrow(MoneyError);
  });

  it("never creates or loses a minor unit for any weights", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CURRENCY_CODES),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc
          .array(fc.integer({ min: 0, max: 10_000 }), {
            minLength: 1,
            maxLength: 20,
          })
          .filter((weights) => weights.some((weight) => weight > 0)),
        (currency, amountMinor, weights) => {
          const total = money(currency, amountMinor);
          const shares = allocate(total, weights);

          expect(shares).toHaveLength(weights.length);
          expect(shares.every((share) => share.currency === currency)).toBe(true);
          expect(shares.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(
            amountMinor,
          );
          expect(shares.every((share) => share.amountMinor >= 0)).toBe(true);

          for (const [index, weight] of weights.entries()) {
            if (weight === 0) expect(shares[index].amountMinor).toBe(0);
          }

          expect(allocate(total, weights)).toEqual(shares);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("display-only FX conversion", () => {
  const rate: FxRate = {
    base: "USD",
    quote: "RWF",
    rate: 1300,
    asOf: "2026-11-14T00:00:00.000Z",
    source: "test",
    expiresAt: "2026-11-16T12:00:00.000Z",
  };

  it("keeps the original amount and currency untouched", () => {
    const original = money("USD", 100);
    const conversion = convertForDisplay(original, "RWF", [rate], NOW);

    expect(conversion).not.toBeNull();
    expect(conversion?.original).toEqual(money("USD", 100));
    expect(conversion?.display).toEqual(money("RWF", 1300));
    expect(original).toEqual(money("USD", 100));
  });

  it("uses an inverse rate when only the opposite pair is available", () => {
    const inverse: FxRate = {
      ...rate,
      base: "RWF",
      quote: "USD",
      rate: 1 / 1300,
    };

    const conversion = convertForDisplay(money("USD", 100), "RWF", [inverse], NOW);
    expect(conversion?.display).toEqual(money("RWF", 1300));
    expect(conversion?.derived).toBe(true);
  });

  it("returns the original only when a rate is missing or expired", () => {
    expect(convertForDisplay(money("USD", 100), "RWF", [], NOW)).toBeNull();
    expect(
      convertForDisplay(
        money("USD", 100),
        "RWF",
        [{ ...rate, expiresAt: "2026-11-15T11:59:59.000Z" }],
        NOW,
      ),
    ).toBeNull();
    expect(formatDisplayAmount(money("USD", 100), "RWF", [], "en-US", NOW)).toEqual({
      original: "1.00 USD",
    });
  });

  it("formats the original and converted amounts together", () => {
    expect(formatDisplayAmount(money("USD", 100), "RWF", [rate], "en-US", NOW)).toEqual({
      original: "1.00 USD",
      display: "1,300 RWF",
      rate,
    });
  });

  it("shows only the original when the currency is already the display currency", () => {
    expect(formatDisplayAmount(money("KES", 150), "KES", [], "en-US", NOW)).toEqual({
      original: "1.50 KES",
    });
  });
});

describe("daily display-rate sources", () => {
  const currencyApiPayload = {
    date: "2026-11-14",
    usd: { rwf: 1300, kes: 129.5, ugx: 3700, tzs: 2600 },
  };
  const openErPayload = {
    result: "success",
    base_code: "USD",
    time_last_update_unix: 1_765_756_800,
    time_next_update_unix: 1_765_843_200,
    rates: { RWF: 1300, KES: 129.5 },
  };

  it("parses the open-source daily source", () => {
    const rates = CURRENCY_API_SOURCE.parse(currencyApiPayload, "USD", ["RWF", "KES"]);

    expect(rates).toHaveLength(2);
    expect(rates[0]).toMatchObject({
      base: "USD",
      quote: "RWF",
      rate: 1300,
      source: "fawazahmed0-currency-api",
      asOf: "2026-11-14T00:00:00.000Z",
      license: "MIT",
    });
    expect(Date.parse(rates[0].expiresAt as string)).toBeGreaterThan(
      Date.parse("2026-11-15T00:00:00.000Z"),
    );
  });

  it("rejects a missing or invalid rate", () => {
    expect(() =>
      CURRENCY_API_SOURCE.parse({ date: "2026-11-14", usd: { rwf: 1300 } }, "USD", [
        "TZS",
      ]),
    ).toThrow();
    expect(() =>
      CURRENCY_API_SOURCE.parse({ date: "2026-11-14", usd: { rwf: Number.NaN } }, "USD", [
        "RWF",
      ]),
    ).toThrow();
  });

  it("parses the fallback source", () => {
    const rates = OPEN_ER_API_SOURCE.parse(openErPayload, "USD", ["RWF"]);
    expect(rates[0]).toMatchObject({
      base: "USD",
      quote: "RWF",
      rate: 1300,
      source: "open-er-api",
    });
  });

  it("fetches from the first healthy source", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => currencyApiPayload,
        }) as Response,
    );

    const result = await fetchDailyRates({
      base: "USD",
      quotes: ["RWF", "RWF", "USD"],
      fetchImpl: fetchMock as unknown as typeof fetch,
      sources: [CURRENCY_API_SOURCE],
    });

    expect(result.source.id).toBe("fawazahmed0-currency-api");
    expect(result.rates).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses Frankfurter v2 rates as the primary daily source", () => {
    expect(DEFAULT_RATE_SOURCES[0].id).toBe("frankfurter-dev");
    const frankfurterPayload = [
      { date: "2026-11-25", base: "USD", quote: "RWF", rate: 1478.21 },
      { date: "2026-11-25", base: "USD", quote: "KES", rate: 129.98 },
    ];
    const rates = FRANKFURTER_API_SOURCE.parse(frankfurterPayload, "USD", [
      "RWF",
      "KES",
    ]);

    expect(rates).toHaveLength(2);
    expect(rates[0]).toMatchObject({
      base: "USD",
      quote: "RWF",
      rate: 1478.21,
      source: "frankfurter-dev",
      sourceUrl: "https://frankfurter.dev/",
      asOf: "2026-11-25T00:00:00.000Z",
    });
  });

  it("rejects missing Frankfurter quotes and falls back cleanly", async () => {
    expect(() =>
      FRANKFURTER_API_SOURCE.parse(
        [{ date: "2026-11-25", base: "USD", quote: "KES", rate: 129.98 }],
        "USD",
        ["RWF"],
      ),
    ).toThrow();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.frankfurter.dev")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { date: "2026-11-25", base: "USD", quote: "RWF", rate: 1478.21 },
          ],
        } as Response;
      }
      return { ok: false, status: 500, json: async () => ({}) } as Response;
    });

    const result = await fetchDailyRates({
      base: "USD",
      quotes: ["RWF"],
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.source.id).toBe("frankfurter-dev");
    expect(result.rates[0].rate).toBe(1478.21);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "https://api.frankfurter.dev/v2/rates?base=USD",
    );
  });

  it("falls back when the first source fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("jsdelivr")) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => openErPayload,
      } as Response;
    });

    const result = await fetchDailyRates({
      base: "USD",
      quotes: ["RWF"],
      fetchImpl: fetchMock as unknown as typeof fetch,
      sources: [CURRENCY_API_SOURCE, OPEN_ER_API_SOURCE],
    });

    expect(result.source.id).toBe("open-er-api");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when every source fails", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response,
    );

    await expect(
      fetchDailyRates({
        base: "USD",
        quotes: ["RWF"],
        fetchImpl: fetchMock as unknown as typeof fetch,
        sources: [CURRENCY_API_SOURCE, OPEN_ER_API_SOURCE],
      }),
    ).rejects.toBeInstanceOf(FxRateError);
  });
});

describe("registry definitions", () => {
  it("exposes every generated definition with a symbol", () => {
    for (const code of CURRENCY_CODES) {
      const definition = getCurrencyDefinition(code);
      expect(definition.code).toBe(code);
      expect(definition.symbol.length).toBeGreaterThan(0);
    }
  });
});
