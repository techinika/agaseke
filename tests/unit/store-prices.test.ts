import { describe, expect, it } from "vitest";
import {
  buildProductPriceMap,
  getProductCurrency,
  getProductPrice,
  getProductPrices,
} from "@/lib/storePrices";

describe("store prices", () => {
  it("reads legacy RWF and USD prices without mixing currencies", () => {
    const product = { currency: "RWF" as const, price: 1000, priceUSD: 1 };

    expect(getProductPrices(product)).toEqual({ RWF: 1000, USD: 1 });
    expect(getProductPrice(product)).toBe(1000);
    expect(getProductPrice(product, "USD")).toBe(1);
  });

  it("does not fall back from a missing USD price to the RWF price", () => {
    const product = { currency: "USD" as const, price: 1000 };

    expect(getProductCurrency(product)).toBe("USD");
    expect(getProductPrices(product)).toEqual({});
    expect(getProductPrice(product)).toBe(0);
    expect(getProductPrice(product, "RWF")).toBe(0);
  });

  it("does not treat the legacy primary price as an RWF price on USD products", () => {
    const product = { currency: "USD" as const, price: 1000, priceUSD: 1 };

    expect(getProductPrices(product)).toEqual({ USD: 1 });
    expect(getProductPrice(product)).toBe(1);
    expect(getProductPrice(product, "RWF")).toBe(0);
  });

  it("treats an explicit price map as authoritative", () => {
    const product = {
      currency: "RWF" as const,
      price: 1000,
      priceUSD: 1,
      prices: { USD: 2 },
    };

    expect(getProductPrices(product)).toEqual({ USD: 2 });
    expect(getProductPrice(product)).toBe(0);
    expect(getProductPrice(product, "USD")).toBe(2);
  });

  it("builds maps only from positive finite amounts", () => {
    expect(buildProductPriceMap({ price: 1000, priceUSD: 1 })).toEqual({
      RWF: 1000,
      USD: 1,
    });
    expect(buildProductPriceMap({ price: 0, priceUSD: -1 })).toEqual({});
    expect(buildProductPriceMap({ price: 1000, priceUSD: 0 })).toEqual({
      RWF: 1000,
    });
  });
});
