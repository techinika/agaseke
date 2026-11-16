import { getCurrencyDefinition, isCurrencyCode } from "./registry.generated";

function currencyFactor(currency: string): number {
  if (!isCurrencyCode(currency)) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  return 10 ** getCurrencyDefinition(currency).minorUnit;
}

export function roundCurrencyAmount(value: number, currency: string): number {
  const factor = currencyFactor(currency);
  return Math.round(value * factor) / factor;
}

export function toMinorUnits(value: number, currency: string): number {
  const factor = currencyFactor(currency);
  const minor = Math.round(value * factor);
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`Amount is outside the safe integer range: ${value} ${currency}`);
  }
  return minor;
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`Minor amount must be an integer: ${amountMinor} ${currency}`);
  }
  return amountMinor / currencyFactor(currency);
}

export function hasCurrencyPrecision(value: number, currency: string): boolean {
  const factor = currencyFactor(currency);
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

export function currencyNumberField(
  value: number,
  currency: string,
): Record<string, unknown> {
  const rounded = roundCurrencyAmount(value, currency);
  return Number.isInteger(rounded)
    ? { integerValue: String(rounded) }
    : { doubleValue: rounded };
}
