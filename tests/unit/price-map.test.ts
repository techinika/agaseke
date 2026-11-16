import { describe, expect, it } from "vitest";
import {
  buildPriceMap,
  getPrice,
  getPriceMap,
  normalizePriceCurrency,
} from "@/lib/priceMap";

describe("generic price maps", () => {
  it("treats an explicit map as authoritative", () => {
    const fields = {
      currency: "RWF" as const,
      price: 1000,
      priceUSD: 1,
      prices: { USD: 2 },
    };

    expect(getPriceMap(fields)).toEqual({ USD: 2 });
    expect(getPrice(fields)).toBe(0);
    expect(getPrice(fields, "USD")).toBe(2);
  });

  it("uses legacy fields only when no map exists", () => {
    const fields = {
      currency: "RWF" as const,
      price: 1000,
      priceUSD: 1,
      prices: null,
    };

    expect(getPriceMap(fields)).toEqual({ RWF: 1000, USD: 1 });
    expect(getPrice(fields)).toBe(1000);
    expect(getPrice(fields, "USD")).toBe(1);
  });

  it("reads the legacy gathering ticketPrice field", () => {
    const fields = { currency: "RWF" as const, ticketPrice: 5000, priceUSD: 5 };

    expect(getPriceMap(fields)).toEqual({ RWF: 5000, USD: 5 });
    expect(getPrice(fields)).toBe(5000);
  });

  it("builds maps from positive finite amounts and defaults to RWF", () => {
    expect(buildPriceMap({ price: 1000, priceUSD: 1 })).toEqual({
      RWF: 1000,
      USD: 1,
    });
    expect(buildPriceMap({ price: 0, priceUSD: -1 })).toEqual({});
    expect(normalizePriceCurrency("USD")).toBe("USD");
    expect(normalizePriceCurrency("EUR")).toBe("RWF");
  });
});
