import {
  createFxCredit,
  createFxDebit,
  createWithdrawalHold,
  createWithdrawalRelease,
  createWithdrawalSettlement,
  type LedgerEntry,
} from "@/lib/money";
import type { PayoutCurrency } from "./currency";
import type { WithdrawalConversionPlan } from "./withdrawalConversion";

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


export interface WithdrawalPlanLedgerInput {
  readonly requestId: string;
  readonly creatorUid: string;
  readonly creatorHandle: string;
  readonly plan: WithdrawalConversionPlan;
  readonly source: string;
  readonly createdAt?: Date;
}

function base(input: WithdrawalPlanLedgerInput) {
  return {
    creatorUid: input.creatorUid,
    creatorHandle: input.creatorHandle,
    withdrawalId: input.requestId,
    metadata: { source: input.source, payoutCurrency: input.plan.payoutCurrency },
    createdAt: input.createdAt ?? new Date(),
  };
}

export function buildWithdrawalHoldLedgerPlan(
  input: WithdrawalPlanLedgerInput,
): readonly LedgerEntry[] {
  const b = base(input);
  return input.plan.sources.flatMap((s) =>
    createWithdrawalHold({
      ...b,
      idempotencyKey: `withdrawal_hold:${input.requestId}:${s.currency}`,
      currency: s.currency,
      amountMinor: s.amountMinor,
      fxRateId: s.fxRateId || undefined,
      metadata: { ...b.metadata, sourceCurrency: s.currency },
    }).entries,
  );
}

export function buildWithdrawalSettlementLedgerPlan(
  input: WithdrawalPlanLedgerInput,
): readonly LedgerEntry[] {
  const b = base(input);
  const entries: LedgerEntry[] = [];

  for (const s of input.plan.sources) {
    if (s.currency === input.plan.payoutCurrency) {
      entries.push(
        ...createWithdrawalSettlement({
          ...b,
          idempotencyKey: `withdrawal_settled:${input.requestId}:${s.currency}`,
          currency: s.currency,
          amountMinor: s.amountMinor,
          metadata: { ...b.metadata, sourceCurrency: s.currency },
        }).entries,
      );
      continue;
    }

    // fx_out in source currency: creator_pending -> fx_clearing
    entries.push(
      ...createFxDebit({
        ...b,
        idempotencyKey: `fx_out:${input.requestId}:${s.currency}`,
        currency: s.currency,
        amountMinor: s.amountMinor,
        fxRateId: s.fxRateId || undefined,
        metadata: {
          ...b.metadata,
          sourceCurrency: s.currency,
          payoutCurrency: input.plan.payoutCurrency,
          payoutAmountMinor: s.payoutAmountMinor,
          rate: s.effectiveRate,
        },
      }).entries,
    );

    // fx_in in payout currency: fx_clearing -> provider_clearing
    entries.push(
      ...createFxCredit({
        ...b,
        idempotencyKey: `fx_in:${input.requestId}:${s.currency}->${input.plan.payoutCurrency}`,
        currency: input.plan.payoutCurrency,
        amountMinor: s.payoutAmountMinor,
        fxRateId: s.fxRateId || undefined,
        metadata: {
          ...b.metadata,
          sourceCurrency: s.currency,
          sourceAmountMinor: s.amountMinor,
          rate: s.effectiveRate,
        },
      }).entries,
    );
  }

  return entries;
}

export function buildWithdrawalReleaseLedgerPlan(
  input: WithdrawalPlanLedgerInput,
): readonly LedgerEntry[] {
  const b = base(input);
  return input.plan.sources.flatMap((s) =>
    createWithdrawalRelease({
      ...b,
      idempotencyKey: `withdrawal_released:${input.requestId}:${s.currency}`,
      currency: s.currency,
      amountMinor: s.amountMinor,
      fxRateId: s.fxRateId || undefined,
      metadata: { ...b.metadata, sourceCurrency: s.currency },
    }).entries,
  );
}
