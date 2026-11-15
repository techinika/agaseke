import {
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "./registry.generated";

export class MoneyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
  }
}

/**
 * An exact amount in a currency's minor unit.
 *
 * `amountMinor` is always a safe integer. Never store a major-unit float on a
 * money-moving path. Ledger entries may be negative; charges are positive.
 */
export interface Money {
  readonly currency: CurrencyCode;
  readonly amountMinor: number;
}

export function money(currency: CurrencyCode, amountMinor: number): Money {
  if (!isCurrencyCode(currency)) {
    throw new MoneyError("UNKNOWN_CURRENCY", `Unknown currency: ${String(currency)}`);
  }

  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(
      "INVALID_MINOR_AMOUNT",
      `Amount must be a safe integer of minor units, got ${String(amountMinor)}`,
    );
  }

  return { currency, amountMinor: amountMinor === 0 ? 0 : amountMinor };
}

export function zero(currency: CurrencyCode): Money {
  return money(currency, 0);
}

function requireDefinition(currency: CurrencyCode) {
  if (!isCurrencyCode(currency)) {
    throw new MoneyError("UNKNOWN_CURRENCY", `Unknown currency: ${String(currency)}`);
  }
  return getCurrencyDefinition(currency);
}

function decimalText(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new MoneyError("INVALID_AMOUNT", "Amount must be a finite number");
    }
    const text = String(value);
    if (/[eE]/.test(text)) {
      throw new MoneyError(
        "INVALID_AMOUNT",
        "Scientific notation is not accepted; pass a decimal string instead",
      );
    }
    return text;
  }

  const text = value.trim();
  if (text === "") {
    throw new MoneyError("INVALID_AMOUNT", "Amount is required");
  }
  if (/[eE]/.test(text)) {
    throw new MoneyError("INVALID_AMOUNT", "Scientific notation is not accepted");
  }
  return text;
}

/**
 * Convert a major-unit value such as `12.34` into minor units.
 *
 * Decimal strings are preferred. A number containing more precision than the
 * currency's minor unit is rejected rather than silently rounded.
 */
export function fromMajor(currency: CurrencyCode, value: number | string): Money {
  const definition = requireDefinition(currency);
  const text = decimalText(value);
  const match = /^([+-]?)(\d+)(?:\.(\d*))?$/.exec(text);

  if (!match) {
    throw new MoneyError(
      "INVALID_AMOUNT",
      `Amount must be a plain decimal, got ${JSON.stringify(text)}`,
    );
  }

  const sign = match[1] === "-" ? -1 : 1;
  const whole = match[2];
  const fraction = match[3] ?? "";

  if (fraction.length > definition.minorUnit) {
    throw new MoneyError(
      "TOO_MANY_DECIMALS",
      `${definition.code} accepts ${definition.minorUnit} decimal place(s), got ${fraction.length}`,
    );
  }

  if (definition.minorUnit === 0 && fraction !== "" && /[1-9]/.test(fraction)) {
    throw new MoneyError(
      "TOO_MANY_DECIMALS",
      `${definition.code} does not accept fractional minor units`,
    );
  }

  const padded = fraction.padEnd(definition.minorUnit, "0");
  const digits = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  const amountMinor = Number(digits);

  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError("AMOUNT_TOO_LARGE", "Amount exceeds the safe integer range");
  }

  return money(currency, sign * amountMinor);
}

/** Parse a user-entered amount, preserving exact minor units. */
export function parseAmountToMinor(raw: string, currency: CurrencyCode): Money {
  if (typeof raw !== "string") {
    throw new MoneyError("INVALID_AMOUNT", "Amount must be text");
  }

  const definition = requireDefinition(currency);
  let text = raw.trim();
  if (text === "") {
    throw new MoneyError("INVALID_AMOUNT", "Amount is required");
  }

  text = text
    .replace(/^([A-Za-z]{3})\s*/, (match, code) =>
      isCurrencyCode(code.toUpperCase()) ? "" : match,
    )
    .replace(/\s*([A-Za-z]{3})$/, (match, code) =>
      isCurrencyCode(code.toUpperCase()) ? "" : match,
    );

  if (/[A-Za-z]/.test(text)) {
    throw new MoneyError("INVALID_AMOUNT", "Remove letters from the amount");
  }

  text = text.replace(/\s+/g, "").replace(/[^\d.,+-]/g, "");

  if (text === "" || !/\d/.test(text)) {
    throw new MoneyError("INVALID_AMOUNT", "Enter a valid amount");
  }
  if (text.includes("-")) {
    throw new MoneyError("INVALID_AMOUNT", "Amount cannot be negative");
  }

  text = text.replace(/^\+/, "");
  if (text.includes("+")) {
    throw new MoneyError("INVALID_AMOUNT", "Invalid amount");
  }

  const dots = text.split(".").length - 1;
  if (dots > 1) {
    throw new MoneyError("INVALID_AMOUNT", "Invalid decimal separator");
  }

  if (dots === 1) {
    text = text.replace(/,/g, "");
  } else if (text.includes(",")) {
    const commaCount = text.split(",").length - 1;
    const afterComma = text.slice(text.lastIndexOf(",") + 1);

    if (
      definition.minorUnit > 0 &&
      commaCount === 1 &&
      afterComma.length > 0 &&
      afterComma.length <= definition.minorUnit
    ) {
      text = text.replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  }

  if (text.startsWith(".")) text = `0${text}`;

  return fromMajor(currency, text);
}

/** Exact major-unit string for display/debugging; not for arithmetic. */
export function toMajorString(value: Money): string {
  const definition = requireDefinition(value.currency);
  const scale = 10 ** definition.minorUnit;
  const negative = value.amountMinor < 0;
  const absolute = Math.abs(value.amountMinor);
  const whole = Math.floor(absolute / scale);
  const fraction = absolute % scale;
  const sign = negative ? "-" : "";

  if (definition.minorUnit === 0) {
    return `${sign}${whole}`;
  }

  return `${sign}${whole}.${String(fraction).padStart(definition.minorUnit, "0")}`;
}

/** Convenience for display only. Use `toMajorString` when exactness matters. */
export function toMajor(value: Money): number {
  return Number(toMajorString(value));
}

export function formatMoney(value: Money, locale = "en-US"): string {
  const definition = requireDefinition(value.currency);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: definition.minorUnit,
    maximumFractionDigits: definition.minorUnit,
  });
  return `${formatter.format(toMajor(value))} ${definition.code}`;
}

export function formatMoneyLeading(value: Money, locale = "en-US"): string {
  const definition = requireDefinition(value.currency);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: definition.minorUnit,
    maximumFractionDigits: definition.minorUnit,
  });
  return `${definition.code} ${formatter.format(toMajor(value))}`;
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new MoneyError(
      "CURRENCY_MISMATCH",
      `Cannot combine ${left.currency} and ${right.currency}`,
    );
  }
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.currency, left.amountMinor + right.amountMinor);
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.currency, left.amountMinor - right.amountMinor);
}

export function negate(value: Money): Money {
  return money(value.currency, -value.amountMinor);
}

export function compare(left: Money, right: Money): -1 | 0 | 1 {
  assertSameCurrency(left, right);
  if (left.amountMinor < right.amountMinor) return -1;
  if (left.amountMinor > right.amountMinor) return 1;
  return 0;
}

export function equals(left: Money, right: Money): boolean {
  return left.currency === right.currency && left.amountMinor === right.amountMinor;
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

export function sumMoney(values: readonly Money[]): Money {
  if (values.length === 0) {
    throw new MoneyError("EMPTY_SUM", "Cannot sum an empty list of amounts");
  }

  return values.slice(1).reduce((total, value) => add(total, value), values[0]);
}

/**
 * Split an amount into integer minor units using the largest-remainder method.
 *
 * Weights must be non-negative safe integers. The returned amounts always sum
 * exactly to the input, so no unit is created or lost.
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  if (total.amountMinor < 0) {
    throw new MoneyError("NEGATIVE_ALLOCATION", "Cannot allocate a negative amount");
  }
  if (weights.length === 0) {
    throw new MoneyError("EMPTY_ALLOCATION", "At least one weight is required");
  }
  if (weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) {
    throw new MoneyError("INVALID_WEIGHT", "Weights must be non-negative safe integers");
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isSafeInteger(weightSum) || weightSum <= 0) {
    throw new MoneyError(
      "INVALID_WEIGHT",
      "Weights must add up to a positive safe integer",
    );
  }

  const totalBig = BigInt(total.amountMinor);
  const sumBig = BigInt(weightSum);
  const shares = weights.map((weight) => (totalBig * BigInt(weight)) / sumBig);
  const remainders = weights.map((weight) => (totalBig * BigInt(weight)) % sumBig);

  const unallocated = totalBig - shares.reduce((sum, share) => sum + share, BigInt(0));

  const order = weights
    .map((_, index) => index)
    .sort((left, right) => {
      const difference = remainders[right] - remainders[left];
      if (difference > BigInt(0)) return 1;
      if (difference < BigInt(0)) return -1;
      return left - right;
    });

  for (let index = 0; index < Number(unallocated); index += 1) {
    shares[order[index]] += BigInt(1);
  }

  return shares.map((share) => money(total.currency, Number(share)));
}

/** Allocate by basis points (1/100 of a percent). The weights must sum to 10,000. */
export function allocateByBps(total: Money, bps: readonly number[]): Money[] {
  if (bps.length === 0) {
    throw new MoneyError(
      "EMPTY_ALLOCATION",
      "At least one basis-point share is required",
    );
  }
  if (bps.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new MoneyError(
      "INVALID_WEIGHT",
      "Basis points must be non-negative safe integers",
    );
  }

  const sum = bps.reduce((totalBps, value) => totalBps + value, 0);
  if (sum !== 10_000) {
    throw new MoneyError("INVALID_WEIGHT", `Basis points must sum to 10,000, got ${sum}`);
  }

  return allocate(total, bps);
}
