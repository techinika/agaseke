import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";

describe("i18n", () => {
  it("resolves nested keys", () => {
    expect(t("common.close")).toBe("Close");
    expect(t("nav.earnings")).toBe("Earnings");
  });

  it("interpolates variables", () => {
    expect(t("support.sheetTitle", { name: "Aline" })).toBe("Support Aline");
    expect(t("support.amount.invalid", { min: 100 })).toContain("100");
  });

  it("falls back to the key so missing strings are visible", () => {
    expect(t("missing.key")).toBe("missing.key");
  });
});
