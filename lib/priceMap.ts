import {
  CURRENCY_CODES,
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/money/registry.generated";

export type PriceCurrency = CurrencyCode;

export type PriceMap = Partial<Record<PriceCurrency, number>>;

export interface PriceFields {
  readonly prices?: PriceMap | null;
  readonly currency?: string | null;
  readonly price?: number | null;
  readonly priceUSD?: number | null;
  readonly ticketPrice?: number | null;
}

function positivePrice(value: unknown): number | undefined {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function hasSupportedPrecision(value: number, currency: PriceCurrency): boolean {
  const factor = 10 ** getCurrencyDefinition(currency).minorUnit;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

function sanitizePriceMap(prices: PriceMap): PriceMap {
  const map: PriceMap = {};

  for (const code of CURRENCY_CODES) {
    const amount = positivePrice(prices[code]);
    if (amount !== undefined && hasSupportedPrecision(amount, code)) {
      map[code] = amount;
    }
  }

  return map;
}

/**
 * Legacy display helper. Money-moving code must use `parsePriceCurrency` and
 * reject a missing currency instead of treating it as RWF.
 */
export function normalizePriceCurrency(currency?: string | null): PriceCurrency {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  return isCurrencyCode(code) ? code : "RWF";
}

export function parsePriceCurrency(currency?: string | null): PriceCurrency | null {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  return isCurrencyCode(code) ? code : null;
}

/**
 * Build a canonical price map. Accepts legacy `price`/`priceUSD` fields for
 * compatibility and/or an explicit `prices` map. Explicit entries win.
 */
export function buildPriceMap(fields: {
  price?: number | null;
  priceUSD?: number | null;
  prices?: PriceMap | Record<string, number | null | undefined> | null;
}): PriceMap {
  const map: PriceMap = {};

  const rwf = positivePrice(fields.price);
  const usd = positivePrice(fields.priceUSD);
  if (rwf !== undefined) map.RWF = rwf;
  if (usd !== undefined) map.USD = usd;

  if (fields.prices && typeof fields.prices === "object") {
    for (const [code, value] of Object.entries(fields.prices)) {
      if (!isCurrencyCode(code)) continue;
      const amount = positivePrice(value);
      if (amount === undefined) {
        delete map[code];
        continue;
      }
      if (hasSupportedPrecision(amount, code)) {
        map[code] = amount;
      }
    }
  }

  return map;
}

export function getPriceMap(fields: PriceFields): PriceMap {
  if (fields.prices && typeof fields.prices === "object") {
    return sanitizePriceMap(fields.prices);
  }

  const map: PriceMap = {};
  const primary = positivePrice(fields.price) ?? positivePrice(fields.ticketPrice);
  const usd = positivePrice(fields.priceUSD);

  if (normalizePriceCurrency(fields.currency) === "USD") {
    if (usd !== undefined) map.USD = usd;
  } else {
    if (primary !== undefined) map.RWF = primary;
    if (usd !== undefined) map.USD = usd;
  }

  return map;
}

export function getPrice(
  fields: PriceFields,
  currency: PriceCurrency = normalizePriceCurrency(fields.currency),
): number {
  return getPriceMap(fields)[currency] ?? 0;
}
