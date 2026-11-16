import { describe, expect, it } from "vitest";
import {
  buildPaymentLedger,
  isMoneyLedgerEnabled,
  ledgerMarkerFields,
} from "../src/money/ledger";

const CREATED_AT = "2026-11-15T12:00:00.000Z";

function stringField(
  document: { fields: Record<string, unknown> },
  field: string,
): string {
  return (document.fields[field] as { stringValue?: string }).stringValue ?? "";
}

function numberField(
  document: { fields: Record<string, unknown> },
  field: string,
): number {
  const value = document.fields[field] as {
    integerValue?: string;
    doubleValue?: number;
  };
  return Number(value.integerValue ?? value.doubleValue ?? Number.NaN);
}

function plan(overrides: Partial<Parameters<typeof buildPaymentLedger>[0]> = {}) {
  return buildPaymentLedger({
    paymentRef: "pay_1",
    source: "support",
    currency: "USD",
    totalAmount: 10,
    creatorUid: "uid_creator",
    creatorHandle: "alice",
    creatorShare: 9,
    platformShare: 0.9,
    referralShare: 0.1,
    referralUid: "uid_referral",
    referralHandle: "bob",
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe("worker ledger dual-write plan", () => {
  it("uses minor units and balanced accounts", () => {
    const result = plan();
    const byAccount = new Map(
      result.documents.map((document) => [
        stringField(document, "account"),
        numberField(document, "amountMinor"),
      ]),
    );

    expect(byAccount.get("creator_available")).toBe(900);
    expect(byAccount.get("platform_income")).toBe(90);
    expect(byAccount.get("referral_available")).toBe(10);
    expect(byAccount.get("provider_clearing")).toBe(-1000);
    expect(byAccount.has("fee_residual")).toBe(false);
    expect(
      result.documents.reduce(
        (sum, document) => sum + numberField(document, "amountMinor"),
        0,
      ),
    ).toBe(0);
  });

  it("folds an unassigned referral slice into fee_residual", () => {
    const result = plan({
      referralUid: undefined,
      referralHandle: undefined,
    });
    const byAccount = new Map(
      result.documents.map((document) => [
        stringField(document, "account"),
        numberField(document, "amountMinor"),
      ]),
    );

    expect(byAccount.get("provider_clearing")).toBe(-1000);
    expect(byAccount.get("creator_available")).toBe(900);
    expect(byAccount.get("platform_income")).toBe(90);
    expect(byAccount.get("fee_residual")).toBe(10);
    expect(byAccount.has("referral_available")).toBe(false);
  });

  it("records unallocated fee configuration as fee_residual", () => {
    const result = plan({
      currency: "RWF",
      totalAmount: 1000,
      creatorShare: 800,
      platformShare: 150,
      referralShare: 10,
      referralUid: undefined,
      referralHandle: undefined,
    });
    const byAccount = new Map(
      result.documents.map((document) => [
        stringField(document, "account"),
        numberField(document, "amountMinor"),
      ]),
    );

    expect(byAccount.get("provider_clearing")).toBe(-1000);
    expect(byAccount.get("creator_available")).toBe(800);
    expect(byAccount.get("platform_income")).toBe(150);
    expect(byAccount.get("fee_residual")).toBe(50);
    expect(
      result.documents.reduce(
        (sum, document) => sum + numberField(document, "amountMinor"),
        0,
      ),
    ).toBe(0);
  });

  it("creates deterministic immutable entry paths", () => {
    const first = plan();
    const second = plan();

    expect(first).toEqual(second);
    expect(first.entryIds).toEqual([
      "pay_1:provider_clearing",
      "pay_1:creator_available",
      "pay_1:platform_income",
      "pay_1:referral_available",
    ]);
    expect(
      first.documents.every(
        (document) => document.path === `ledgerEntries/${document.id}`,
      ),
    ).toBe(true);
  });

  it("projects creator and referral available balances", () => {
    const result = plan();

    expect(result.balances).toEqual([
      {
        path: "creatorBalances/alice",
        fields: {
          "available.USD": 900,
          "lifetimeEarned.USD": 900,
          version: 1,
        },
      },
      {
        path: "creatorBalances/bob",
        fields: {
          "available.USD": 10,
          "lifetimeEarned.USD": 10,
          version: 1,
        },
      },
    ]);
  });

  it("fails closed on bad input", () => {
    expect(() => plan({ currency: "ZZZ" })).toThrow();
    expect(() => plan({ totalAmount: 0 })).toThrow();
    expect(() => plan({ totalAmount: Number.NaN })).toThrow();
    expect(() => plan({ paymentRef: "" })).toThrow();
    expect(() => plan({ totalAmount: Number.MAX_SAFE_INTEGER })).toThrow();
  });

  it("is enabled only by the explicit true flag", () => {
    expect(isMoneyLedgerEnabled({})).toBe(false);
    expect(isMoneyLedgerEnabled({ MONEY_LEDGER_ENABLED: "false" })).toBe(false);
    expect(isMoneyLedgerEnabled({ MONEY_LEDGER_ENABLED: "1" })).toBe(false);
    expect(isMoneyLedgerEnabled({ MONEY_LEDGER_ENABLED: "true" })).toBe(true);
  });

  it("records ledger ids on the payment marker", () => {
    const result = plan();
    const marker = ledgerMarkerFields(result);

    expect(marker.ledgerMode).toEqual({ stringValue: "dual_write_v1" });
    expect(marker.ledgerEntryIds).toEqual({
      arrayValue: {
        values: result.entryIds.map((id) => ({ stringValue: id })),
      },
    });
  });
});
