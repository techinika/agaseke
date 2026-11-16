import { fromMajor, toMajor, type CurrencyCode, type Money } from "@/lib/money";
import { parsePayoutCurrency, PAYOUT_CURRENCIES, type PayoutCurrency } from "./currency";

export type WithdrawalErrorCode =
  | "UNSUPPORTED_CURRENCY"
  | "INVALID_AMOUNT"
  | "ZERO_WITHDRAWAL"
  | "INVALID_BALANCE"
  | "INVALID_BALANCE_STATE"
  | "WITHDRAWAL_BELOW_THRESHOLD"
  | "INSUFFICIENT_AVAILABLE_BALANCE";

export class WithdrawalError extends Error {
  readonly code: WithdrawalErrorCode;

  constructor(code: WithdrawalErrorCode, message: string) {
    super(message);
    this.name = "WithdrawalError";
    this.code = code;
  }
}

export interface WithdrawalValidationInput {
  readonly currency: unknown;
  readonly amount: unknown;
  readonly pending: unknown;
  readonly held?: unknown;
  readonly threshold: unknown;
}

export interface ValidatedWithdrawal {
  readonly currency: PayoutCurrency;
  readonly amount: Money;
  readonly amountMajor: number;
  readonly pendingMinor: number;
  readonly heldMinor: number;
  readonly availableMinor: number;
  readonly thresholdMinor: number;
}

function minorFromField(currency: CurrencyCode, value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value !== "number" && typeof value !== "string") {
    throw new WithdrawalError("INVALID_BALANCE", `${label} is not a number`);
  }

  try {
    return fromMajor(currency, value).amountMinor;
  } catch (error) {
    throw new WithdrawalError(
      "INVALID_BALANCE",
      `${label} is invalid: ${error instanceof Error ? error.message : "unknown value"}`,
    );
  }
}

export function validateWithdrawalRequest(
  input: WithdrawalValidationInput,
): ValidatedWithdrawal {
  let currency: PayoutCurrency;
  try {
    currency = parsePayoutCurrency(input.currency);
  } catch {
    throw new WithdrawalError(
      "UNSUPPORTED_CURRENCY",
      `Withdrawals support ${PAYOUT_CURRENCIES.join(" and ")} only`,
    );
  }

  if (typeof input.amount !== "string" && typeof input.amount !== "number") {
    throw new WithdrawalError("INVALID_AMOUNT", "Amount is required");
  }

  let amount: Money;
  try {
    amount = fromMajor(currency, input.amount);
  } catch (error) {
    throw new WithdrawalError(
      "INVALID_AMOUNT",
      error instanceof Error ? error.message : "Amount is invalid",
    );
  }

  if (amount.amountMinor <= 0) {
    throw new WithdrawalError("ZERO_WITHDRAWAL", "Amount must be greater than zero");
  }

  const pendingMinor = minorFromField(currency, input.pending, "Pending balance");
  const heldMinor = minorFromField(currency, input.held, "Held balance");
  const thresholdMinor = minorFromField(
    currency,
    input.threshold,
    "Withdrawal threshold",
  );

  if (thresholdMinor <= 0) {
    throw new WithdrawalError(
      "INVALID_BALANCE",
      "Withdrawal threshold must be configured",
    );
  }
  if (heldMinor > pendingMinor) {
    throw new WithdrawalError(
      "INVALID_BALANCE_STATE",
      "Held withdrawals exceed the pending balance",
    );
  }

  const availableMinor = pendingMinor - heldMinor;
  if (amount.amountMinor > availableMinor) {
    throw new WithdrawalError(
      "INSUFFICIENT_AVAILABLE_BALANCE",
      "Insufficient available balance",
    );
  }
  if (amount.amountMinor < thresholdMinor) {
    throw new WithdrawalError(
      "WITHDRAWAL_BELOW_THRESHOLD",
      `Minimum withdrawal is ${toMajor({ currency, amountMinor: thresholdMinor })} ${currency}`,
    );
  }

  return {
    currency,
    amount,
    amountMajor: toMajor(amount),
    pendingMinor,
    heldMinor,
    availableMinor,
    thresholdMinor,
  };
}
