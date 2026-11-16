export type PriceCurrency = "RWF" | "USD";

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

function sanitizePriceMap(prices: PriceMap): PriceMap {
  const map: PriceMap = {};
  const rwf = positivePrice(prices.RWF);
  const usd = positivePrice(prices.USD);
  if (rwf !== undefined) map.RWF = rwf;
  if (usd !== undefined) map.USD = usd;
  return map;
}

export function normalizePriceCurrency(currency?: string | null): PriceCurrency {
  return currency === "USD" ? "USD" : "RWF";
}

export function buildPriceMap(fields: {
  price?: number | null;
  priceUSD?: number | null;
}): PriceMap {
  const map: PriceMap = {};
  const rwf = positivePrice(fields.price);
  const usd = positivePrice(fields.priceUSD);
  if (rwf !== undefined) map.RWF = rwf;
  if (usd !== undefined) map.USD = usd;
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
