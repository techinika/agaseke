import {
  buildPriceMap,
  getPrice,
  getPriceMap,
  normalizePriceCurrency,
  type PriceCurrency,
  type PriceFields,
  type PriceMap,
} from "./priceMap";

export type StoreCurrency = PriceCurrency;
export type StorePriceFields = PriceFields;
export type { PriceCurrency, PriceMap };

export function getProductCurrency(product: { currency?: string | null }): StoreCurrency {
  return normalizePriceCurrency(product.currency);
}

export const buildProductPriceMap = buildPriceMap;

export function getProductPrices(product: StorePriceFields): PriceMap {
  return getPriceMap(product);
}

export function getProductPrice(
  product: StorePriceFields,
  currency: StoreCurrency = getProductCurrency(product),
): number {
  return getPrice(product, currency);
}
