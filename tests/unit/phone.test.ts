import { describe, expect, it } from "vitest";
import {
  formatRwandaPhone,
  getRwandaNetwork,
  isValidRwandaPhone,
  normalizeRwandaPhone,
  toRwandaE164,
} from "@/lib/format/phone";

describe("Rwanda phone formatting", () => {
  it("normalizes local, E.164 and bare forms", () => {
    expect(normalizeRwandaPhone("078 123 4567")).toBe("0781234567");
    expect(normalizeRwandaPhone("+250781234567")).toBe("0781234567");
    expect(normalizeRwandaPhone("250781234567")).toBe("0781234567");
    expect(normalizeRwandaPhone("781234567")).toBe("0781234567");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeRwandaPhone("0712345678")).toBe("");
    expect(normalizeRwandaPhone("07812345")).toBe("");
    expect(isValidRwandaPhone("0781234567")).toBe(true);
    expect(isValidRwandaPhone("12345")).toBe(false);
  });

  it("formats for display and API", () => {
    expect(formatRwandaPhone("0781234567")).toBe("078 123 4567");
    expect(toRwandaE164("0781234567")).toBe("+250781234567");
  });

  it("detects the mobile network", () => {
    expect(getRwandaNetwork("0781234567")).toBe("MTN");
    expect(getRwandaNetwork("0791234567")).toBe("MTN");
    expect(getRwandaNetwork("0721234567")).toBe("Airtel");
    expect(getRwandaNetwork("0731234567")).toBe("Airtel");
    expect(getRwandaNetwork("0711234567")).toBeNull();
  });
});
