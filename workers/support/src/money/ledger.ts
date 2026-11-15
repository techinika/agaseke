import { getCurrencyDefinition, isCurrencyCode } from "./registry.generated";

/**
 * Phase 2 dual-write plan. These writes are added to the same Firestore commit
 * as the legacy counters and `paymentApplications` marker, so enabling the
 * ledger cannot credit a payment twice.
 */

export interface PaymentLedgerInput {
  paymentRef: string;
  source: string;
  currency: string;
  totalAmount: number;
  creatorUid?: string;
  creatorHandle?: string;
  creatorShare: number;
  platformShare: number;
  referralShare?: number;
  referralUid?: string;
  referralHandle?: string;
  createdAt: string;
}

export interface LedgerDocument {
  id: string;
  path: string;
  fields: Record<string, unknown>;
}

export interface LedgerIncrement {
  path: string;
  fields: Record<string, number>;
}

export interface PaymentLedgerPlan {
  entryIds: string[];
  documents: LedgerDocument[];
  balances: LedgerIncrement[];
}

export function isMoneyLedgerEnabled(env: { MONEY_LEDGER_ENABLED?: string }): boolean {
  return env.MONEY_LEDGER_ENABLED === "true";
}

function minorUnits(currency: string): number {
  if (!isCurrencyCode(currency)) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  return getCurrencyDefinition(currency).minorUnit;
}

function toMinor(value: number, currency: string): number {
  const factor = 10 ** minorUnits(currency);
  const minor = Math.round(value * factor);
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`Ledger amount is outside the safe integer range: ${value} ${currency}`);
  }
  return minor;
}

function safeKey(paymentRef: string): string {
  const key = paymentRef.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 180);
  if (!key) throw new Error("Payment reference is required for ledger entries");
  return key;
}

function entryFields(
  input: PaymentLedgerInput,
  entryId: string,
  account: string,
  amountMinor: number,
  type: "payment_credit" | "referral_credit",
  creatorUid?: string,
  creatorHandle?: string,
): Record<string, unknown> {
  return {
    idempotencyKey: { stringValue: entryId },
    paymentRef: { stringValue: input.paymentRef },
    transactionId: { stringValue: input.paymentRef },
    account: { stringValue: account },
    type: { stringValue: type },
    currency: { stringValue: input.currency },
    amountMinor: { integerValue: String(amountMinor) },
    creatorUid: creatorUid ? { stringValue: creatorUid } : { nullValue: null },
    creatorHandle: creatorHandle ? { stringValue: creatorHandle } : { nullValue: null },
    source: { stringValue: input.source },
    createdAt: { timestampValue: input.createdAt },
  };
}

export function buildPaymentLedger(input: PaymentLedgerInput): PaymentLedgerPlan {
  if (!isCurrencyCode(input.currency)) {
    throw new Error(`Unknown currency: ${input.currency}`);
  }
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error("Ledger total must be positive");
  }

  const key = safeKey(input.paymentRef);
  const totalMinor = toMinor(input.totalAmount, input.currency);
  const creatorMinor = toMinor(input.creatorShare, input.currency);
  const platformMinor = toMinor(input.platformShare, input.currency);
  const hasReferralRecipient = Boolean(input.referralHandle || input.referralUid);
  const referralMinor = hasReferralRecipient
    ? toMinor(input.referralShare ?? 0, input.currency)
    : 0;
  const sharesTotal = creatorMinor + platformMinor + referralMinor;
  const residual = totalMinor - sharesTotal;

  if (!Number.isSafeInteger(sharesTotal)) {
    throw new Error("Ledger shares are outside the safe integer range");
  }

  const documents: LedgerDocument[] = [];
  const add = (
    account: string,
    amountMinor: number,
    type: "payment_credit" | "referral_credit" = "payment_credit",
    creatorUid?: string,
    creatorHandle?: string,
  ) => {
    if (amountMinor === 0) return;
    const id = `${key}:${account}`;
    documents.push({
      id,
      path: `ledgerEntries/${id}`,
      fields: entryFields(input, id, account, amountMinor, type, creatorUid, creatorHandle),
    });
  };

  add("provider_clearing", -totalMinor);
  add("creator_available", creatorMinor, "payment_credit", input.creatorUid, input.creatorHandle);
  add("platform_income", platformMinor);
  if (referralMinor !== 0) {
    add(
      "referral_available",
      referralMinor,
      "referral_credit",
      input.referralUid,
      input.referralHandle,
    );
  }
  add("fee_residual", residual);

  const balances: LedgerIncrement[] = [];
  if (input.creatorHandle && creatorMinor !== 0) {
    balances.push({
      path: `creatorBalances/${input.creatorHandle}`,
      fields: {
        [`available.${input.currency}`]: creatorMinor,
        [`lifetimeEarned.${input.currency}`]: creatorMinor,
        version: 1,
      },
    });
  }
  if (input.referralHandle && referralMinor !== 0) {
    balances.push({
      path: `creatorBalances/${input.referralHandle}`,
      fields: {
        [`available.${input.currency}`]: referralMinor,
        [`lifetimeEarned.${input.currency}`]: referralMinor,
        version: 1,
      },
    });
  }

  return {
    entryIds: documents.map((document) => document.id),
    documents,
    balances,
  };
}

export function ledgerMarkerFields(plan: PaymentLedgerPlan): Record<string, unknown> {
  return {
    ledgerMode: { stringValue: "dual_write_v1" },
    ledgerEntryIds: {
      arrayValue: {
        values: plan.entryIds.map((id) => ({ stringValue: id })),
      },
    },
  };
}
