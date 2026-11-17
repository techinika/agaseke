import { parsePayoutCurrency, PAYOUT_CURRENCIES, type PayoutCurrency } from "./currency";

export const PAYOUT_PROVIDERS = {
  manual: {
    id: "manual",
    label: "Manual processing",
    currencies: PAYOUT_CURRENCIES,
  },
} as const;

export type PayoutProvider = keyof typeof PAYOUT_PROVIDERS;

export type PayoutRail = "mobile_money" | "bank_transfer";

export interface PayoutRoute {
  currency: PayoutCurrency;
  provider: PayoutProvider;
  rail: PayoutRail;
}

export interface PayoutRouteOptions {
  provider?: unknown;
  rail?: unknown;
  payoutPreference?: unknown;
}

export type PayoutRouteErrorCode =
  "UNSUPPORTED_PAYOUT_PROVIDER" | "UNSUPPORTED_PAYOUT_ROUTE";

export class PayoutRouteError extends Error {
  readonly code: PayoutRouteErrorCode;

  constructor(code: PayoutRouteErrorCode, message: string) {
    super(message);
    this.name = "PayoutRouteError";
    this.code = code;
  }
}

function defaultRail(currency: PayoutCurrency): PayoutRail {
  return currency === "RWF" ? "mobile_money" : "bank_transfer";
}

function normalizeRail(raw: unknown): PayoutRail | null {
  if (typeof raw !== "string") return null;
  const rail = raw.trim().toLowerCase();
  if (rail === "mobile_money" || rail === "mobile-money") return "mobile_money";
  if (rail === "bank_transfer" || rail === "bank-transfer" || rail === "bank") {
    return "bank_transfer";
  }
  return null;
}

function preferenceRail(raw: unknown): PayoutRail | null {
  if (typeof raw !== "string") return null;
  const preference = raw.trim().toLowerCase();
  if (preference === "bank" || preference === "bank_transfer") {
    return "bank_transfer";
  }
  if (
    preference === "momo" ||
    preference === "mtn" ||
    preference === "airtel" ||
    preference === "mobile_money" ||
    preference === "mobile money"
  ) {
    return "mobile_money";
  }
  return null;
}

function providerForCurrency(raw: unknown, currency: PayoutCurrency): PayoutProvider {
  const id = typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : "manual";
  if (!Object.prototype.hasOwnProperty.call(PAYOUT_PROVIDERS, id)) {
    throw new PayoutRouteError(
      "UNSUPPORTED_PAYOUT_PROVIDER",
      `Unsupported payout provider: ${id}`,
    );
  }
  const provider = PAYOUT_PROVIDERS[id as PayoutProvider];
  if (!provider.currencies.includes(currency)) {
    throw new PayoutRouteError(
      "UNSUPPORTED_PAYOUT_ROUTE",
      `${provider.label} does not support ${currency} payouts`,
    );
  }
  return provider.id;
}

export function resolvePayoutRoute(
  currencyRaw: unknown,
  options: PayoutRouteOptions = {},
): PayoutRoute {
  const currency = parsePayoutCurrency(currencyRaw);
  const provider = providerForCurrency(options.provider, currency);
  const configuredRail = normalizeRail(options.rail);
  const preferredRail = preferenceRail(options.payoutPreference);
  const rail =
    configuredRail ??
    (currency === "RWF" ? preferredRail : "bank_transfer") ??
    defaultRail(currency);

  if (currency !== "RWF" && rail !== "bank_transfer") {
    throw new PayoutRouteError(
      "UNSUPPORTED_PAYOUT_ROUTE",
      `${currency} payouts must use a bank transfer rail`,
    );
  }

  return { currency, provider, rail };
}
