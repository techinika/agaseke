import { describe, expect, it } from "vitest";
import {
  buildWithdrawalHoldLedger,
  buildWithdrawalReleaseLedger,
  buildWithdrawalSettlementLedger,
  ledgerEntryDocument,
} from "@/lib/payouts/withdrawalLedger";

const input = {
  requestId: "request-123",
  creatorUid: "uid-1",
  creatorHandle: "alice",
  currency: "USD" as const,
  amountMinor: 1234,
  source: "test",
  createdAt: new Date("2026-11-16T12:00:00.000Z"),
};

function total(entries: readonly { amountMinor: number }[]) {
  return entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
}

describe("withdrawal ledger builders", () => {
  it("moves available funds into pending on hold", () => {
    const entries = buildWithdrawalHoldLedger(input);

    expect(entries.map((entry) => entry.type)).toEqual([
      "withdrawal_hold",
      "withdrawal_hold",
    ]);
    expect(entries.map((entry) => entry.account)).toEqual([
      "creator_available",
      "creator_pending",
    ]);
    expect(entries.map((entry) => entry.amountMinor)).toEqual([-1234, 1234]);
    expect(total(entries)).toBe(0);
  });

  it("settles a hold without touching available balance", () => {
    const entries = buildWithdrawalSettlementLedger(input);

    expect(entries.map((entry) => entry.account)).toEqual([
      "creator_pending",
      "provider_clearing",
    ]);
    expect(entries.map((entry) => entry.amountMinor)).toEqual([-1234, 1234]);
    expect(total(entries)).toBe(0);
  });

  it("returns a held amount to available on release", () => {
    const entries = buildWithdrawalReleaseLedger(input);

    expect(entries.map((entry) => entry.account)).toEqual([
      "creator_available",
      "creator_pending",
    ]);
    expect(entries.map((entry) => entry.amountMinor)).toEqual([1234, -1234]);
    expect(total(entries)).toBe(0);
  });

  it("serializes timestamps and omits empty optional fields", () => {
    const [entry] = buildWithdrawalHoldLedger(input);
    const document = ledgerEntryDocument(entry);

    expect(document.createdAt).toBeInstanceOf(Date);
    expect(document.withdrawalId).toBe("request-123");
    expect(document.paymentRef).toBeUndefined();
  });
});
