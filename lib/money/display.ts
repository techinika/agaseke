import { getCurrencyDefinition, type CurrencyCode } from "./registry.generated";
import { MoneyError, formatMoney, money, type Money } from "./money";

/**
 * A display-only exchange rate.
 *
 * Money movement must store the rate id and use a fresh quote. Display code may
 * use a cached rate and must always keep the original amount and currency.
 */
export interface FxRate {
  readonly base: CurrencyCode;
  readonly quote: CurrencyCode;
  readonly rate: number;
  readonly asOf: string;
  readonly source: string;
  readonly sourceUrl?: string;
  readonly license?: string;
  readonly expiresAt?: string;
  readonly derived?: boolean;
}

export interface DisplayConversion {
  readonly original: Money;
  readonly display: Money;
  readonly rate: FxRate | null;
  readonly derived: boolean;
}

export interface FormattedDisplayAmount {
  readonly original: string;
  readonly display?: string;
  readonly rate?: FxRate;
}

function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Math.abs(value));
  return value < 0 ? -rounded : rounded;
}

export function isRateUsable(rate: FxRate, now: Date = new Date()): boolean {
  if (!Number.isFinite(rate.rate) || rate.rate <= 0) return false;

  if (rate.expiresAt) {
    const expiry = Date.parse(rate.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now.getTime()) return false;
  }

  return true;
}

function convertWithRate(original: Money, target: CurrencyCode, rate: FxRate): Money {
  const sourceDefinition = getCurrencyDefinition(original.currency);
  const targetDefinition = getCurrencyDefinition(target);
  const sourceScale = 10 ** sourceDefinition.minorUnit;
  const targetScale = 10 ** targetDefinition.minorUnit;
  const rawTargetMinor = (original.amountMinor * rate.rate * targetScale) / sourceScale;
  const targetMinor = roundHalfAwayFromZero(rawTargetMinor);

  if (!Number.isSafeInteger(targetMinor)) {
    throw new MoneyError("AMOUNT_TOO_LARGE", "Converted display amount is too large");
  }

  return money(target, targetMinor);
}

/**
 * Convert an amount for display only.
 *
 * Returns `null` when no usable rate exists. The caller must render the original
 * amount in that case. The original `Money` is never modified.
 */
export function convertForDisplay(
  original: Money,
  target: CurrencyCode,
  rates: readonly FxRate[],
  now: Date = new Date(),
): DisplayConversion | null {
  if (original.currency === target) {
    return { original, display: original, rate: null, derived: false };
  }

  const direct = rates.find(
    (rate) =>
      rate.base === original.currency && rate.quote === target && isRateUsable(rate, now),
  );

  if (direct) {
    return {
      original,
      display: convertWithRate(original, target, direct),
      rate: direct,
      derived: false,
    };
  }

  const inverse = rates.find(
    (rate) =>
      rate.base === target && rate.quote === original.currency && isRateUsable(rate, now),
  );

  if (!inverse) return null;

  const inverseRate = 1 / inverse.rate;
  if (!Number.isFinite(inverseRate) || inverseRate <= 0) return null;

  const derivedRate: FxRate = {
    ...inverse,
    base: original.currency,
    quote: target,
    rate: inverseRate,
    derived: true,
  };

  return {
    original,
    display: convertWithRate(original, target, derivedRate),
    rate: derivedRate,
    derived: true,
  };
}

/**
 * Format the original amount and, when a usable rate exists, a converted
 * display amount. The original is always present and is never rounded away.
 */
export function formatDisplayAmount(
  original: Money,
  target: CurrencyCode,
  rates: readonly FxRate[],
  locale = "en-US",
  now: Date = new Date(),
): FormattedDisplayAmount {
  const conversion = convertForDisplay(original, target, rates, now);

  if (!conversion || conversion.rate === null) {
    return { original: formatMoney(original, locale) };
  }

  return {
    original: formatMoney(original, locale),
    display: formatMoney(conversion.display, locale),
    rate: conversion.rate,
  };
}
