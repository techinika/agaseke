import { describe, expect, it } from "vitest";
import { maskPayoutNumber } from "@/lib/format/payout";

describe("payout number masking", () => {
  it("masks all but the first two and last three digits", () => {
    expect(maskPayoutNumber("078 000 0000")).toBe("07••••• 000");
  });

  it("masks an already-trimmed local number", () => {
    expect(maskPayoutNumber("0781234567")).toBe("07••••• 567");
  });

  it("handles an empty value", () => {
    expect(maskPayoutNumber("")).toBe("");
    expect(maskPayoutNumber("")).toBe("");
  });
});
