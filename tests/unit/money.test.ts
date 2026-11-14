import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatMoneyInput,
  formatMoneyLeading,
  formatNumber,
  parseMoneyInput,
} from "@/lib/format/money";

describe("money formatting", () => {
  it("formats whole RWF amounts with grouping", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatMoney(1000)).toBe("1,000 RWF");
    expect(formatMoneyLeading(500)).toBe("RWF 500");
  });

  it("treats missing and invalid values as zero", () => {
    expect(formatMoney(null)).toBe("0 RWF");
    expect(formatMoney(undefined)).toBe("0 RWF");
    expect(formatMoney("not-a-number")).toBe("0 RWF");
  });

  it("parses messy user input", () => {
    expect(parseMoneyInput("1,000 RWF")).toBe(1000);
    expect(parseMoneyInput(" 500 ")).toBe(500);
    expect(parseMoneyInput("12.6")).toBe(13);
    expect(parseMoneyInput("abc")).toBe(0);
  });

  it("does not show a zero placeholder while the field is empty", () => {
    expect(formatMoneyInput("")).toBe("");
    expect(formatMoneyInput(0)).toBe("0");
  });
});
