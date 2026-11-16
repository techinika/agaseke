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
 * Build a canonical price map from an explicit `prices` map.
 * Legacy `price` is only applied to the declared `currency` (or RWF for
 * legacy records without currency) for backward compatibility.
 */
export function buildPriceMap(fields: {
  price?: number | null;
  ticketPrice?: number | null;
  currency?: string | null;
  prices?: PriceMap | Record<string, number | null | undefined> | null;
}): PriceMap {
  const map: PriceMap = {};

  if (fields.prices && typeof fields.prices === "object") {
    for (const [code, value] of Object.entries(fields.prices)) {
      const upper = code.toUpperCase();
      if (!isCurrencyCode(upper)) continue;
      const amount = positivePrice(value);
      if (amount !== undefined && hasSupportedPrecision(amount, upper)) {
        map[upper] = amount;
      }
    }
  }

  if (Object.keys(map).length === 0) {
    const legacy = positivePrice(fields.price) ?? positivePrice(fields.ticketPrice);
    // Legacy compatibility: records without an explicit currency were RWF-only.
    const currency = parsePriceCurrency(fields.currency) ?? "RWF";
    if (legacy !== undefined && hasSupportedPrecision(legacy, currency)) {
      map[currency] = legacy;
    }
  }

  return map;
}

export function getPriceMap(fields: PriceFields): PriceMap {
  if (fields.prices && typeof fields.prices === "object" && Object.keys(fields.prices).length > 0) {
    return sanitizePriceMap(fields.prices as PriceMap);
  }
  return buildPriceMap(fields);
}

export function getPrice(
  fields: PriceFields,
  currency?: PriceCurrency,
): number {
  const map = getPriceMap(fields);
  const code = currency ?? parsePriceCurrency(fields.currency) ?? (Object.keys(map)[0] as PriceCurrency | undefined);
  return code ? map[code] ?? 0 : 0;
}
