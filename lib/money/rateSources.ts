import { isCurrencyCode, type CurrencyCode } from "./registry.generated";
import type { FxRate } from "./display";

export interface DailyRateSource {
  readonly id: string;
  readonly name: string;
  readonly license: string;
  readonly homepage: string;
  readonly url: (base: CurrencyCode) => string;
  readonly parse: (
    payload: unknown,
    base: CurrencyCode,
    quotes: readonly CurrencyCode[],
  ) => FxRate[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RATE_GRACE_HOURS = 36;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dailyExpiry(date: string): string {
  const start = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(start)) {
    throw new Error(`Invalid rate date: ${date}`);
  }
  return new Date(start + RATE_GRACE_HOURS * 60 * 60 * 1000).toISOString();
}

function readRate(
  table: Record<string, unknown>,
  quote: CurrencyCode,
  sourceId: string,
): number {
  const key = quote.toLowerCase();
  const rate = table[key];

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`${sourceId} is missing a valid ${quote} rate`);
  }

  return rate;
}

/**
 * fawazahmed0/currency-api: open-source (MIT), daily rates, 300+ currencies,
 * served from jsDelivr. This is the primary display-rate source.
 */
export const CURRENCY_API_SOURCE: DailyRateSource = {
  id: "fawazahmed0-currency-api",
  name: "Currency API (fawazahmed0)",
  license: "MIT",
  homepage: "https://github.com/fawazahmed0/currency-api",
  url: (base) =>
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.min.json`,
  parse: (payload, base, quotes) => {
    if (!isRecord(payload)) {
      throw new Error("Currency API returned an invalid payload");
    }

    const date = payload.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Currency API payload is missing its rate date");
    }

    const table = payload[base.toLowerCase()];
    if (!isRecord(table)) {
      throw new Error(`Currency API payload is missing the ${base} table`);
    }

    const asOf = `${date}T00:00:00.000Z`;
    const expiresAt = dailyExpiry(date);

    return quotes.map((quote) => ({
      base,
      quote,
      rate: readRate(table, quote, "Currency API"),
      asOf,
      source: "fawazahmed0-currency-api",
      sourceUrl: "https://github.com/fawazahmed0/currency-api",
      license: "MIT",
      expiresAt,
    }));
  },
};

/**
 * ExchangeRate-API's free open-access endpoint. It is a fallback, not an
 * open-source project; review its attribution terms before production use.
 */
export const OPEN_ER_API_SOURCE: DailyRateSource = {
  id: "open-er-api",
  name: "ExchangeRate-API (open access)",
  license: "Free public endpoint (not open source)",
  homepage: "https://www.exchangerate-api.com/docs/free",
  url: (base) => `https://open.er-api.com/v6/latest/${base}`,
  parse: (payload, base, quotes) => {
    if (!isRecord(payload) || payload.result !== "success") {
      throw new Error("ExchangeRate-API returned an unsuccessful payload");
    }

    const table = payload.rates;
    if (!isRecord(table)) {
      throw new Error("ExchangeRate-API payload is missing rates");
    }

    let asOf: string;
    if (typeof payload.time_last_update_unix === "number") {
      asOf = new Date(payload.time_last_update_unix * 1000).toISOString();
    } else if (typeof payload.time_last_update_utc === "string") {
      const parsed = new Date(payload.time_last_update_utc);
      if (!Number.isFinite(parsed.getTime())) {
        throw new Error("ExchangeRate-API timestamp is invalid");
      }
      asOf = parsed.toISOString();
    } else {
      throw new Error("ExchangeRate-API payload is missing its timestamp");
    }

    const expiresAt =
      typeof payload.time_next_update_unix === "number"
        ? new Date(payload.time_next_update_unix * 1000).toISOString()
        : new Date(Date.parse(asOf) + DAY_MS).toISOString();

    return quotes.map((quote) => {
      const rate = table[quote];
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
        throw new Error(`ExchangeRate-API is missing a valid ${quote} rate`);
      }

      return {
        base,
        quote,
        rate,
        asOf,
        source: "open-er-api",
        sourceUrl: "https://www.exchangerate-api.com/docs/free",
        license: "Free public endpoint (not open source)",
        expiresAt,
      };
    });
  },
};

export const DEFAULT_RATE_SOURCES: readonly DailyRateSource[] = [
  CURRENCY_API_SOURCE,
  OPEN_ER_API_SOURCE,
];

export class FxRateError extends Error {
  readonly attempts: readonly string[];

  constructor(message: string, attempts: readonly string[]) {
    super(message);
    this.name = "FxRateError";
    this.attempts = attempts;
  }
}

export interface FetchDailyRatesParams {
  readonly base: CurrencyCode;
  readonly quotes: readonly CurrencyCode[];
  readonly fetchImpl?: typeof fetch;
  readonly sources?: readonly DailyRateSource[];
  readonly timeoutMs?: number;
}

export interface FetchDailyRatesResult {
  readonly rates: FxRate[];
  readonly source: DailyRateSource;
}

/**
 * Fetch daily display rates server-side, with a fallback source.
 *
 * This is for display and cached read models only. Withdrawals must use a
 * locked quote with an id and never a rate fetched opportunistically at payout.
 */
export async function fetchDailyRates(
  params: FetchDailyRatesParams,
): Promise<FetchDailyRatesResult> {
  if (!isCurrencyCode(params.base)) {
    throw new FxRateError(`Unknown base currency: ${String(params.base)}`, []);
  }

  for (const quote of params.quotes) {
    if (!isCurrencyCode(quote)) {
      throw new FxRateError(`Unknown quote currency: ${String(quote)}`, []);
    }
  }

  const quotes = [...new Set(params.quotes)].filter((quote) => quote !== params.base);
  const sources = params.sources ?? DEFAULT_RATE_SOURCES;

  if (sources.length === 0) {
    throw new FxRateError("No rate sources configured", []);
  }

  if (quotes.length === 0) {
    return { rates: [], source: sources[0] };
  }

  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new FxRateError("No fetch implementation available", []);
  }

  const timeoutMs = Math.max(1, params.timeoutMs ?? 10_000);
  const attempts: string[] = [];

  for (const source of sources) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(source.url(params.base), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      const rates = source.parse(payload, params.base, quotes);

      if (rates.length !== quotes.length) {
        throw new Error(`expected ${quotes.length} rates, got ${rates.length}`);
      }

      return { rates, source };
    } catch (error) {
      attempts.push(
        `${source.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new FxRateError(`Unable to fetch display rates for ${params.base}`, attempts);
}
