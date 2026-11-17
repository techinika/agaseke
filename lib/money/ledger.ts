import { isCurrencyCode, type CurrencyCode } from "./registry.generated";
import { MoneyError, equals, money, subtract, type Money } from "./money";

export type LedgerEntryType =
  | "payment_credit"
  | "referral_credit"
  | "withdrawal_hold"
  | "withdrawal_settled"
  | "withdrawal_released"
  | "fx_debit"
  | "fx_credit"
  | "adjustment"
  | "opening_balance"
  | "migration_reversal";

export type LedgerAccount =
  | "provider_clearing"
  | "creator_available"
  | "creator_pending"
  | "platform_income"
  | "referral_available"
  | "fee_residual"
  | "opening_equity"
  | "fx_clearing";

export type LedgerMetadataValue = string | number | boolean | null;

export interface LedgerPosting {
  readonly account: LedgerAccount;
  readonly amountMinor: number;
}

export interface LedgerEntry {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly account: LedgerAccount;
  readonly currency: CurrencyCode;
  readonly amountMinor: number;
  readonly type: LedgerEntryType;
  readonly creatorUid?: string;
  readonly creatorHandle?: string;
  readonly paymentRef?: string;
  readonly transactionId?: string;
  readonly withdrawalId?: string;
  readonly fxRateId?: string;
  readonly metadata?: Readonly<Record<string, LedgerMetadataValue>>;
  readonly createdAt: string;
}

export interface LedgerTransaction {
  readonly idempotencyKey: string;
  readonly type: LedgerEntryType;
  readonly currency: CurrencyCode;
  readonly createdAt: string;
  readonly entries: readonly LedgerEntry[];
}

interface LedgerTransactionBase {
  readonly idempotencyKey: string;
  readonly currency: CurrencyCode;
  readonly creatorUid?: string;
  readonly creatorHandle?: string;
  readonly paymentRef?: string;
  readonly transactionId?: string;
  readonly withdrawalId?: string;
  readonly fxRateId?: string;
  readonly metadata?: Readonly<Record<string, LedgerMetadataValue>>;
  readonly createdAt: Date | string;
}

export interface PaymentCreditInput extends LedgerTransactionBase {
  readonly creatorShareMinor: number;
  readonly platformShareMinor: number;
  readonly referralShareMinor?: number;
}

export interface WithdrawalInput extends LedgerTransactionBase {
  readonly amountMinor: number;
}

export type OpeningBalanceAccount =
  "creator_available" | "creator_pending" | "platform_income" | "referral_available";

export interface OpeningBalanceInput extends LedgerTransactionBase {
  readonly amountMinor: number;
  readonly account?: OpeningBalanceAccount;
}

export interface LedgerBalanceFilter {
  readonly account: LedgerAccount;
  readonly currency: CurrencyCode;
  readonly creatorUid?: string;
  readonly creatorHandle?: string;
}

export interface LedgerReconciliation {
  readonly expected: Money;
  readonly actual: Money;
  readonly difference: Money;
  readonly reconciled: boolean;
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;

function fail(code: string, message: string): never {
  throw new MoneyError(code, message);
}

function assertCurrency(currency: CurrencyCode): void {
  if (!isCurrencyCode(currency)) {
    fail("UNKNOWN_CURRENCY", `Unknown currency: ${String(currency)}`);
  }
}

function assertSafeAmount(amountMinor: number, label: string): void {
  if (!Number.isSafeInteger(amountMinor)) {
    fail("INVALID_MINOR_AMOUNT", `${label} must be a safe integer of minor units`);
  }
}

function assertNonZero(amountMinor: number, label: string): void {
  assertSafeAmount(amountMinor, label);
  if (amountMinor === 0) {
    fail("ZERO_LEDGER_POSTING", `${label} cannot be zero`);
  }
}

function assertNonNegative(amountMinor: number, label: string): void {
  assertSafeAmount(amountMinor, label);
  if (amountMinor < 0) {
    fail("NEGATIVE_LEDGER_SHARE", `${label} cannot be negative`);
  }
}

function assertIdempotencyKey(key: string): void {
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    fail(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency key must be 1-200 characters of letters, digits, dot, colon, underscore or hyphen",
    );
  }
  if (key === "." || key === "..") {
    fail("INVALID_IDEMPOTENCY_KEY", "Idempotency key cannot be a relative path segment");
  }
}

function toIsoTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    fail("INVALID_TIMESTAMP", "Ledger timestamp is invalid");
  }
  return date.toISOString();
}

function ledgerEntryId(idempotencyKey: string, account: LedgerAccount): string {
  return `${idempotencyKey}:${account}`;
}

export function createLedgerTransaction(
  input: LedgerTransactionBase,
  type: LedgerEntryType,
  postings: readonly LedgerPosting[],
): LedgerTransaction {
  assertIdempotencyKey(input.idempotencyKey);
  assertCurrency(input.currency);

  if (postings.length < 2) {
    fail(
      "INVALID_LEDGER_TRANSACTION",
      "A ledger transaction needs at least two postings",
    );
  }

  const accounts = new Set<LedgerAccount>();
  let total = 0;

  for (const posting of postings) {
    assertNonZero(posting.amountMinor, `Posting ${posting.account}`);
    if (accounts.has(posting.account)) {
      fail(
        "DUPLICATE_LEDGER_ACCOUNT",
        `Account ${posting.account} appears more than once in one transaction`,
      );
    }
    accounts.add(posting.account);
    total += posting.amountMinor;
    assertSafeAmount(total, "Transaction total");
  }

  if (total !== 0) {
    fail(
      "UNBALANCED_LEDGER_TRANSACTION",
      `Ledger transaction must sum to zero, got ${total}`,
    );
  }

  const createdAt = toIsoTimestamp(input.createdAt);
  const metadata = input.metadata ? { ...input.metadata } : undefined;

  const entries = postings
    .slice()
    .sort((left, right) => left.account.localeCompare(right.account))
    .map((posting): LedgerEntry => ({
      id: ledgerEntryId(input.idempotencyKey, posting.account),
      idempotencyKey: input.idempotencyKey,
      account: posting.account,
      currency: input.currency,
      amountMinor: posting.amountMinor,
      type,
      creatorUid: input.creatorUid,
      creatorHandle: input.creatorHandle,
      paymentRef: input.paymentRef,
      transactionId: input.transactionId,
      withdrawalId: input.withdrawalId,
      fxRateId: input.fxRateId,
      metadata,
      createdAt,
    }));

  return {
    idempotencyKey: input.idempotencyKey,
    type,
    currency: input.currency,
    createdAt,
    entries,
  };
}

/**
 * Build a balanced creator/platform/referral credit transaction.
 *
 * The provider clearing account is the external source of funds, so the total
 * of the three shares must equal the amount debited from it.
 */
export function createPaymentCredit(input: PaymentCreditInput): LedgerTransaction {
  assertNonNegative(input.creatorShareMinor, "Creator share");
  assertNonNegative(input.platformShareMinor, "Platform share");
  const referralShareMinor = input.referralShareMinor ?? 0;
  assertNonNegative(referralShareMinor, "Referral share");

  const total = input.creatorShareMinor + input.platformShareMinor + referralShareMinor;
  assertSafeAmount(total, "Payment credit total");

  if (total <= 0) {
    fail("INVALID_LEDGER_TRANSACTION", "A payment credit must be positive");
  }

  const postings: LedgerPosting[] = [
    { account: "provider_clearing", amountMinor: -total },
  ];

  if (input.creatorShareMinor > 0) {
    postings.push({
      account: "creator_available",
      amountMinor: input.creatorShareMinor,
    });
  }
  if (input.platformShareMinor > 0) {
    postings.push({
      account: "platform_income",
      amountMinor: input.platformShareMinor,
    });
  }
  if (referralShareMinor > 0) {
    postings.push({
      account: "referral_available",
      amountMinor: referralShareMinor,
    });
  }

  return createLedgerTransaction(input, "payment_credit", postings);
}

export function createOpeningBalance(input: OpeningBalanceInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "Opening balance");
  if (input.amountMinor < 0) {
    fail("INVALID_OPENING_BALANCE", "Opening balance must be positive");
  }

  return createLedgerTransaction(input, "opening_balance", [
    { account: "opening_equity", amountMinor: -input.amountMinor },
    { account: input.account ?? "creator_available", amountMinor: input.amountMinor },
  ]);
}

export function createWithdrawalHold(input: WithdrawalInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "Withdrawal amount");
  if (input.amountMinor < 0) {
    fail("INVALID_WITHDRAWAL_AMOUNT", "Withdrawal amount must be positive");
  }

  return createLedgerTransaction(input, "withdrawal_hold", [
    { account: "creator_available", amountMinor: -input.amountMinor },
    { account: "creator_pending", amountMinor: input.amountMinor },
  ]);
}

export function createWithdrawalSettlement(input: WithdrawalInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "Withdrawal amount");
  if (input.amountMinor < 0) {
    fail("INVALID_WITHDRAWAL_AMOUNT", "Withdrawal amount must be positive");
  }

  return createLedgerTransaction(input, "withdrawal_settled", [
    { account: "creator_pending", amountMinor: -input.amountMinor },
    { account: "provider_clearing", amountMinor: input.amountMinor },
  ]);
}

export function createWithdrawalRelease(input: WithdrawalInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "Withdrawal amount");
  if (input.amountMinor < 0) {
    fail("INVALID_WITHDRAWAL_AMOUNT", "Withdrawal amount must be positive");
  }

  return createLedgerTransaction(input, "withdrawal_released", [
    { account: "creator_pending", amountMinor: -input.amountMinor },
    { account: "creator_available", amountMinor: input.amountMinor },
  ]);
}

export function ledgerBalance(
  entries: readonly LedgerEntry[],
  filter: LedgerBalanceFilter,
): Money {
  assertCurrency(filter.currency);

  let total = 0;
  for (const entry of entries) {
    if (entry.account !== filter.account || entry.currency !== filter.currency) {
      continue;
    }
    if (filter.creatorUid !== undefined && entry.creatorUid !== filter.creatorUid) {
      continue;
    }
    if (
      filter.creatorHandle !== undefined &&
      entry.creatorHandle !== filter.creatorHandle
    ) {
      continue;
    }

    total += entry.amountMinor;
    assertSafeAmount(total, "Ledger balance");
  }

  return money(filter.currency, total);
}

export function ledgerAccountBalances(
  entries: readonly LedgerEntry[],
  currency: CurrencyCode,
): Readonly<Record<LedgerAccount, Money>> {
  assertCurrency(currency);

  const balances: Record<LedgerAccount, number> = {
    provider_clearing: 0,
    creator_available: 0,
    creator_pending: 0,
    platform_income: 0,
    referral_available: 0,
    fee_residual: 0,
    opening_equity: 0,
    fx_clearing: 0,
  };

  for (const entry of entries) {
    if (entry.currency !== currency) continue;
    balances[entry.account] += entry.amountMinor;
    assertSafeAmount(balances[entry.account], "Ledger account balance");
  }

  return {
    provider_clearing: money(currency, balances.provider_clearing),
    creator_available: money(currency, balances.creator_available),
    creator_pending: money(currency, balances.creator_pending),
    platform_income: money(currency, balances.platform_income),
    referral_available: money(currency, balances.referral_available),
    fee_residual: money(currency, balances.fee_residual),
    opening_equity: money(currency, balances.opening_equity),
    fx_clearing: money(currency, balances.fx_clearing),
  };
}

export function netLedgerBalance(
  entries: readonly LedgerEntry[],
  currency: CurrencyCode,
): Money {
  assertCurrency(currency);

  let total = 0;
  for (const entry of entries) {
    if (entry.currency !== currency) continue;
    total += entry.amountMinor;
    assertSafeAmount(total, "Net ledger balance");
  }

  return money(currency, total);
}

export function reconcileLedgerBalance(
  expected: Money,
  entries: readonly LedgerEntry[],
  filter: LedgerBalanceFilter,
): LedgerReconciliation {
  const actual = ledgerBalance(entries, filter);

  return {
    expected,
    actual,
    difference: subtract(expected, actual),
    reconciled: equals(expected, actual),
  };
}


export interface FxConversionInput extends LedgerTransactionBase {
  readonly amountMinor: number;
}

/**
 * fx_out: debit a source-currency account into fx_clearing as part of a
 * cross-currency withdrawal conversion. Paired with fx_in in payout currency.
 */
export function createFxDebit(input: FxConversionInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "FX amount");
  if (input.amountMinor < 0) {
    fail("INVALID_FX_AMOUNT", "FX amount must be positive");
  }
  return createLedgerTransaction(input, "fx_debit", [
    { account: "creator_pending", amountMinor: -input.amountMinor },
    { account: "fx_clearing", amountMinor: input.amountMinor },
  ]);
}

/**
 * fx_in: credit payout currency from fx_clearing for settlement to provider.
 */
export function createFxCredit(input: FxConversionInput): LedgerTransaction {
  assertNonZero(input.amountMinor, "FX amount");
  if (input.amountMinor < 0) {
    fail("INVALID_FX_AMOUNT", "FX amount must be positive");
  }
  return createLedgerTransaction(input, "fx_credit", [
    { account: "fx_clearing", amountMinor: -input.amountMinor },
    { account: "provider_clearing", amountMinor: input.amountMinor },
  ]);
}
