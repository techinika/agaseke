import {
  getPaymentRailProvider,
  isPaymentMethod,
  PAYMENT_RAIL_PROVIDER_LIST,
  type PaymentMethod,
  type PaymentRailProvider,
} from "./rails.generated";
import { isCurrencyCode, type CurrencyCode } from "./registry.generated";

export type PaymentRailErrorCode =
  | "UNSUPPORTED_CURRENCY"
  | "UNSUPPORTED_METHOD"
  | "UNSUPPORTED_COUNTRY";

export class PaymentRailError extends Error {
  readonly code: PaymentRailErrorCode;

  constructor(code: PaymentRailErrorCode, message: string) {
    super(message);
    this.name = "PaymentRailError";
    this.code = code;
  }
}

export interface AvailablePaymentMethod {
  readonly method: PaymentMethod;
  readonly provider: string;
  readonly label: string;
}

function normalizeCountry(country: unknown): string | null {
  return typeof country === "string" && /^[A-Za-z]{2}$/.test(country.trim())
    ? country.trim().toUpperCase()
    : null;
}

/**
 * Providers that can charge `currency`, optionally restricted to the
 * supporter's country. The creator's currency never participates here.
 */
export function getPaymentProviders(
  currency: unknown,
  country?: unknown,
): PaymentRailProvider[] {
  if (!isCurrencyCode(currency)) return [];
  const supporterCountry = normalizeCountry(country);

  return PAYMENT_RAIL_PROVIDER_LIST.filter((provider) => {
    if (!provider.currencies.includes(currency)) return false;
    if (!supporterCountry) return true;
    return provider.countries.includes(supporterCountry);
  });
}

/**
 * The method matrix served to the support sheet and enforced at initiation.
 * A currency with no collection rail returns an empty list, not RWF.
 */
export function getAvailableMethods(
  currency: unknown,
  country?: unknown,
): AvailablePaymentMethod[] {
  if (!isCurrencyCode(currency)) return [];

  const methods: AvailablePaymentMethod[] = [];
  const seen = new Set<PaymentMethod>();

  for (const provider of getPaymentProviders(currency, country)) {
    for (const method of provider.methods) {
      if (seen.has(method)) continue;
      seen.add(method);
      methods.push({ method, provider: provider.id, label: provider.label });
    }
  }

  return methods;
}

export function isCurrencySupportedByMethod(
  method: unknown,
  currency: unknown,
): boolean {
  if (!isPaymentMethod(method) || !isCurrencyCode(currency)) return false;
  return PAYMENT_RAIL_PROVIDER_LIST.some(
    (provider) =>
      provider.methods.includes(method) && provider.currencies.includes(currency),
  );
}

export function assertMethodSupportsCurrency(
  method: unknown,
  currency: unknown,
): PaymentRailProvider {
  if (!isCurrencyCode(currency)) {
    throw new PaymentRailError(
      "UNSUPPORTED_CURRENCY",
      `Unsupported currency: ${String(currency)}`,
    );
  }
  if (!isPaymentMethod(method)) {
    throw new PaymentRailError(
      "UNSUPPORTED_METHOD",
      `Unsupported payment method: ${String(method)}`,
    );
  }

  const provider = PAYMENT_RAIL_PROVIDER_LIST.find(
    (candidate) =>
      candidate.methods.includes(method) && candidate.currencies.includes(currency),
  );

  if (!provider) {
    throw new PaymentRailError(
      "UNSUPPORTED_METHOD",
      `${method} cannot charge ${currency}`,
    );
  }

  return provider;
}

export function getProviderForMethod(method: unknown): PaymentRailProvider | null {
  if (!isPaymentMethod(method)) return null;
  return (
    PAYMENT_RAIL_PROVIDER_LIST.find((provider) => provider.methods.includes(method)) ??
    null
  );
}

export function getSupportedCurrenciesForMethod(method: unknown): CurrencyCode[] {
  if (!isPaymentMethod(method)) return [];
  const currencies = new Set<CurrencyCode>();

  for (const provider of PAYMENT_RAIL_PROVIDER_LIST) {
    if (!provider.methods.includes(method)) continue;
    for (const currency of provider.currencies) {
      if (isCurrencyCode(currency)) currencies.add(currency);
    }
  }

  return [...currencies];
}

export { getPaymentRailProvider, isPaymentMethod };
export type { PaymentMethod, PaymentRailProvider };
