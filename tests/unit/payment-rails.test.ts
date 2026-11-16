import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAYMENT_RAIL_PROVIDERS,
  PaymentRailError,
  assertMethodSupportsCurrency,
  getAvailableMethods,
  getSupportedCurrenciesForMethod,
  isCurrencySupportedByMethod,
} from "@/lib/money";

describe("payment rail registry", () => {
  it("keeps the payments worker rails module identical to the root module", () => {
    const root = process.cwd();
    expect(
      readFileSync(join(root, "workers/payments/src/money/rails.ts"), "utf8"),
    ).toBe(readFileSync(join(root, "lib/money/rails.ts"), "utf8"));
  });

  it("derives the method matrix from configuration", () => {
    expect(getAvailableMethods("RWF").map((entry) => entry.method)).toEqual([
      "momo",
      "card",
    ]);
    expect(getAvailableMethods("USD").map((entry) => entry.method)).toEqual(["card"]);
    expect(getAvailableMethods("KES").map((entry) => entry.method)).toEqual(["card"]);
    expect(getAvailableMethods("EUR")).toEqual([]);
    expect(getAvailableMethods("ZZZ")).toEqual([]);
  });

  it("can restrict methods to the supporter's country", () => {
    expect(getAvailableMethods("RWF", "RW").map((entry) => entry.method)).toEqual([
      "momo",
      "card",
    ]);
    expect(getAvailableMethods("RWF", "KE").map((entry) => entry.method)).toEqual([
      "card",
    ]);
    expect(getAvailableMethods("USD", "US").map((entry) => entry.method)).toEqual([
      "card",
    ]);
  });

  it("enforces provider capability server-side", () => {
    expect(assertMethodSupportsCurrency("momo", "RWF").id).toBe("paypack");
    expect(assertMethodSupportsCurrency("card", "KES").id).toBe("pesapal");
    expect(() => assertMethodSupportsCurrency("momo", "KES")).toThrow(PaymentRailError);
    expect(() => assertMethodSupportsCurrency("card", "EUR")).toThrow(PaymentRailError);
    expect(isCurrencySupportedByMethod("card", "UGX")).toBe(true);
    expect(isCurrencySupportedByMethod("momo", "USD")).toBe(false);
  });

  it("lists every currency that a method can charge", () => {
    expect(getSupportedCurrenciesForMethod("momo")).toEqual(["RWF"]);
    expect(getSupportedCurrenciesForMethod("card")).toEqual([
      "RWF",
      "USD",
      "KES",
      "UGX",
      "TZS",
    ]);
    expect(Object.keys(PAYMENT_RAIL_PROVIDERS).sort()).toEqual(["paypack", "pesapal"]);
  });
});
