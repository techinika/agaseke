import { describe, expect, it } from "vitest";
import { currencyNumberField, roundCurrencyAmount } from "../src/money/amount";

describe("worker money precision", () => {
  it("preserves cents for two-decimal currencies", () => {
    expect(roundCurrencyAmount(0.8, "USD")).toBe(0.8);
    expect(roundCurrencyAmount(0.125, "USD")).toBe(0.13);
    expect(roundCurrencyAmount(12.345, "KES")).toBe(12.35);
  });

  it("rounds zero-decimal currencies to whole units", () => {
    expect(roundCurrencyAmount(100.4, "RWF")).toBe(100);
    expect(roundCurrencyAmount(100.6, "UGX")).toBe(101);
  });

  it("encodes USD cents as doubles and RWF as integers", () => {
    expect(currencyNumberField(0.75, "USD")).toEqual({ doubleValue: 0.75 });
    expect(currencyNumberField(100, "RWF")).toEqual({ integerValue: "100" });
  });

  it("rejects unknown currencies instead of defaulting", () => {
    expect(() => roundCurrencyAmount(1, "ZZZ")).toThrow("Unknown currency");
  });
});
