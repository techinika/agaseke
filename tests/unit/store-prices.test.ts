import { describe, expect, it } from "vitest";
import {
  buildProductPriceMap,
  getProductCurrency,
  getProductPrice,
  getProductPrices,
} from "@/lib/storePrices";

describe("store prices", () => {
  it("reads canonical prices map authoritatively", () => {
    const product = {
      currency: "RWF" as const,
      price: 1000,
      prices: { USD: 2 },
    };

    expect(getProductPrices(product)).toEqual({ USD: 2 });
    expect(getProductPrice(product)).toBe(0);
    expect(getProductPrice(product, "USD")).toBe(2);
  });

  it("uses legacy primary price for the declared currency", () => {
    expect(getProductPrices({ currency: "RWF", price: 1000, prices: null })).toEqual({ RWF: 1000 });
    expect(getProductPrices({ currency: "USD", price: 2, prices: null })).toEqual({ USD: 2 });
    expect(getProductCurrency({ currency: "USD" as const })).toBe("USD");
  });

  it("defaults legacy records without currency to RWF", () => {
    expect(getProductPrices({ price: 1000 })).toEqual({ RWF: 1000 });
    expect(getProductPrice({ price: 1000 })).toBe(1000);
  });

  it("builds maps only from valid positive amounts", () => {
    expect(buildProductPriceMap({ prices: { RWF: 1000, USD: 1 } })).toEqual({
      RWF: 1000,
      USD: 1,
    });
    expect(buildProductPriceMap({ price: 0 })).toEqual({});
  });
});
