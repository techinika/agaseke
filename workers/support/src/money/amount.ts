import { getCurrencyDefinition, isCurrencyCode } from "./registry.generated";

export function roundCurrencyAmount(value: number, currency: string): number {
  if (!isCurrencyCode(currency)) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  const factor = 10 ** getCurrencyDefinition(currency).minorUnit;
  return Math.round(value * factor) / factor;
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
