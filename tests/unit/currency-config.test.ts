import { describe, expect, it } from "vitest";
import { validateCurrencyConfig } from "@/lib/money";

describe("admin currency config", () => {
  it("normalizes a supported code and fills registry defaults", () => {
    const result = validateCurrencyConfig({
      code: " rwf ",
      payoutThreshold: "10000",
      minSupportAmount: "100",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        code: "RWF",
        name: "Rwandan Franc",
        symbol: "FRw",
        payoutThreshold: 10000,
        minSupportAmount: 100,
        enabled: true,
      },
    });
  });

  it("rejects codes outside the registry", () => {
    expect(
      validateCurrencyConfig({
        code: "ZZZ",
        payoutThreshold: "100",
        minSupportAmount: "1",
      }),
    ).toEqual({ ok: false, error: "Unsupported currency code: ZZZ" });
  });

  it("enforces the currency minor unit on thresholds", () => {
    expect(
      validateCurrencyConfig({
        code: "RWF",
        payoutThreshold: "100.5",
        minSupportAmount: "100",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateCurrencyConfig({
        code: "USD",
        payoutThreshold: "100.50",
        minSupportAmount: "1.25",
      }),
    ).toMatchObject({ ok: true });

    expect(
      validateCurrencyConfig({
        code: "JPY",
        payoutThreshold: "100.5",
        minSupportAmount: "100",
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects zero, negative and malformed amounts", () => {
    for (const amount of ["0", "-1", "abc", ""]) {
      expect(
        validateCurrencyConfig({
          code: "USD",
          payoutThreshold: amount,
          minSupportAmount: "1",
        }),
      ).toMatchObject({ ok: false });
    }
  });

  it("preserves an explicit disabled state", () => {
    const result = validateCurrencyConfig({
      code: "KES",
      payoutThreshold: "500",
      minSupportAmount: "10",
      enabled: false,
    });

    expect(result).toMatchObject({ ok: true, value: { enabled: false } });
  });
});
