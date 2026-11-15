import {
  createWithdrawalHold,
  createWithdrawalRelease,
  createWithdrawalSettlement,
  type LedgerEntry,
} from "@/lib/money";
import type { PayoutCurrency } from "./currency";

export function isMoneyLedgerEnabled(): boolean {
  return process.env.MONEY_LEDGER_ENABLED === "true";
}

export interface WithdrawalLedgerInput {
  readonly requestId: string;
  readonly creatorUid: string;
  readonly creatorHandle: string;
  readonly currency: PayoutCurrency;
  readonly amountMinor: number;
  readonly source: string;
  readonly createdAt?: Date;
}

function build(
  input: WithdrawalLedgerInput,
  type: "hold" | "settled" | "released",
): readonly LedgerEntry[] {
  const options = {
    idempotencyKey: `withdrawal_${type}:${input.requestId}`,
    currency: input.currency,
    amountMinor: input.amountMinor,
    creatorUid: input.creatorUid,
    creatorHandle: input.creatorHandle,
    withdrawalId: input.requestId,
    metadata: { source: input.source },
    createdAt: input.createdAt ?? new Date(),
  };

  if (type === "hold") return createWithdrawalHold(options).entries;
  if (type === "settled") return createWithdrawalSettlement(options).entries;
  return createWithdrawalRelease(options).entries;
}

export function buildWithdrawalHoldLedger(
  input: WithdrawalLedgerInput,
): readonly LedgerEntry[] {
  return build(input, "hold");
}

export function buildWithdrawalSettlementLedger(
  input: WithdrawalLedgerInput,
): readonly LedgerEntry[] {
  return build(input, "settled");
}

export function buildWithdrawalReleaseLedger(
  input: WithdrawalLedgerInput,
): readonly LedgerEntry[] {
  return build(input, "released");
}

export function ledgerEntryDocument(entry: LedgerEntry): Record<string, unknown> {
  const document: Record<string, unknown> = {
    id: entry.id,
    idempotencyKey: entry.idempotencyKey,
    account: entry.account,
    currency: entry.currency,
    amountMinor: entry.amountMinor,
    type: entry.type,
    createdAt: new Date(entry.createdAt),
  };

  if (entry.creatorUid) document.creatorUid = entry.creatorUid;
  if (entry.creatorHandle) document.creatorHandle = entry.creatorHandle;
  if (entry.paymentRef) document.paymentRef = entry.paymentRef;
  if (entry.transactionId) document.transactionId = entry.transactionId;
  if (entry.withdrawalId) document.withdrawalId = entry.withdrawalId;
  if (entry.fxRateId) document.fxRateId = entry.fxRateId;
  if (entry.metadata) document.metadata = entry.metadata;

  return document;
}
