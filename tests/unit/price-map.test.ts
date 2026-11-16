import { describe, expect, it } from "vitest";
import {
  buildPriceMap,
  getPrice,
  getPriceMap,
  normalizePriceCurrency,
  parsePriceCurrency,
} from "@/lib/priceMap";

describe("generic price maps", () => {
  it("treats an explicit prices map as authoritative", () => {
    const fields = {
      currency: "RWF" as const,
      price: 1000,
      prices: { USD: 2 },
    };

    expect(getPriceMap(fields)).toEqual({ USD: 2 });
    expect(getPrice(fields)).toBe(0);
    expect(getPrice(fields, "USD")).toBe(2);
  });

  it("uses legacy primary price for declared currency when no map exists", () => {
    expect(getPriceMap({ currency: "RWF" as const, price: 1000 })).toEqual({ RWF: 1000 });
    expect(getPriceMap({ currency: "USD" as const, price: 2 })).toEqual({ USD: 2 });
    expect(getPrice({ currency: "RWF" as const, price: 1000 })).toBe(1000);
  });

  it("defaults legacy records without currency to RWF", () => {
    expect(getPriceMap({ ticketPrice: 5000 })).toEqual({ RWF: 5000 });
    expect(getPrice({ ticketPrice: 5000 })).toBe(5000);
  });

  it("builds canonical maps and ignores unsupported precision", () => {
    expect(buildPriceMap({ prices: { USD: 1.2, RWF: 1000 } })).toEqual({
      USD: 1.2,
      RWF: 1000,
    });
    expect(buildPriceMap({ price: 0 })).toEqual({});
    expect(buildPriceMap({ prices: { RWF: 1.5 } as any })).toEqual({});
  });

  it("normalizes/parses currency codes", () => {
    expect(parsePriceCurrency("usd")).toBe("USD");
    expect(parsePriceCurrency("zzz")).toBeNull();
    expect(normalizePriceCurrency("USD")).toBe("USD");
    expect(normalizePriceCurrency("ZZZ")).toBe("RWF");
  });
});
