import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSupportConfig,
  calculateSupportBreakdown,
  clearPendingSupport,
  clearSupportDraft,
  isValidSupportAmount,
  networkForPhone,
  normalizeTransactionStatus,
  perksForCreator,
  readLastChoice,
  readPendingSupport,
  readSupportDraft,
  saveLastChoice,
  savePendingSupport,
  saveSupportDraft,
  transactionFromSnapshot,
} from "@/features/support/utils";
import type { PendingSupport, SupportCreator } from "@/features/support/types";

const creator: SupportCreator = {
  uid: "uid-1",
  handle: "aline",
  name: "Aline Uwase",
  currency: "RWF",
  storeEnabled: true,
  giveawayEnabled: true,
  gatheringsEnabled: false,
  communityEnabled: true,
  bookingEnabled: false,
};

describe("support money", () => {
  it("splits the amount into creator share and fee without decimals", () => {
    expect(calculateSupportBreakdown(1000, 0.9)).toEqual({
      total: 1000,
      creatorReceives: 900,
      fee: 100,
    });
    expect(calculateSupportBreakdown(999, 0.9)).toEqual({
      total: 999,
      creatorReceives: 899,
      fee: 100,
    });
    expect(calculateSupportBreakdown(0, 0.9)).toEqual({
      total: 0,
      creatorReceives: 0,
      fee: 0,
    });
  });

  it("validates the minimum amount", () => {
    expect(isValidSupportAmount(500, 100)).toBe(true);
    expect(isValidSupportAmount(99, 100)).toBe(false);
    expect(isValidSupportAmount("", 100)).toBe(false);
  });

  it("builds config from the creator currency with a safe minimum", () => {
    expect(buildSupportConfig({ currency: "RWF" })).toMatchObject({
      currency: "RWF",
      minAmount: 100,
    });
    expect(buildSupportConfig({ currency: "USD" })).toMatchObject({
      currency: "USD",
      minAmount: 1,
    });
    expect(buildSupportConfig({ currency: "RWF" }, 250).minAmount).toBe(250);
  });
});

describe("transaction status", () => {
  it("normalises provider and legacy statuses", () => {
    expect(normalizeTransactionStatus("successful")).toBe("success");
    expect(normalizeTransactionStatus("completed")).toBe("success");
    expect(normalizeTransactionStatus("PAID")).toBe("success");
    expect(normalizeTransactionStatus("failed")).toBe("failed");
    expect(normalizeTransactionStatus("cancelled")).toBe("failed");
    expect(normalizeTransactionStatus("reversed")).toBe("failed");
    expect(normalizeTransactionStatus("pending")).toBe("waiting");
    expect(normalizeTransactionStatus(undefined)).toBe("waiting");
  });

  it("extracts a typed snapshot from Firestore data", () => {
    expect(
      transactionFromSnapshot({ ref: "abc", status: "successful", amount: 500 }),
    ).toEqual({
      ref: "abc",
      status: "successful",
      amount: 500,
      currency: undefined,
      type: undefined,
    });
  });
});

describe("mobile networks", () => {
  it("detects MTN and Airtel prefixes", () => {
    expect(networkForPhone("078 123 4567")).toBe("MTN");
    expect(networkForPhone("0791234567")).toBe("MTN");
    expect(networkForPhone("0721234567")).toBe("Airtel");
    expect(networkForPhone("0731234567")).toBe("Airtel");
    expect(networkForPhone("250781234567")).toBe("MTN");
    expect(networkForPhone("")).toBeNull();
    expect(networkForPhone("0700000000")).toBeNull();
  });
});

describe("perks and persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("lists only the perks the creator actually offers", () => {
    expect(perksForCreator(creator)).toEqual(["store", "giveaways", "community"]);
  });

  it("round-trips the last support choice", () => {
    saveLastChoice({ amount: 2000, method: "card" });
    expect(readLastChoice()).toEqual({ amount: 2000, method: "card" });
  });

  it("round-trips pending support and clears it", () => {
    const pending: PendingSupport = {
      handle: "aline",
      reference: "ref-1",
      amount: 1000,
      currency: "RWF",
      method: "momo",
      createdAt: 123,
    };
    savePendingSupport(pending);
    expect(readPendingSupport("aline")).toEqual(pending);
    expect(readPendingSupport("other")).toBeNull();
    clearPendingSupport();
    expect(readPendingSupport()).toBeNull();
  });

  it("round-trips a mid-flow draft per creator", () => {
    saveSupportDraft("aline", {
      amount: 500,
      message: "keep going",
      method: "momo",
      network: "MTN",
      phone: "078 123 4567",
    });
    expect(readSupportDraft("aline")?.amount).toBe(500);
    expect(readSupportDraft("other")).toBeNull();
    clearSupportDraft();
    expect(readSupportDraft("aline")).toBeNull();
  });
});
