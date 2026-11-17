import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "@/lib/money";

export const PAYOUT_CURRENCIES = CURRENCY_CODES;

export type PayoutCurrency = CurrencyCode;

export function normalizePayoutCurrency(raw: unknown): PayoutCurrency | null {
  const currency = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return isCurrencyCode(currency) ? currency : null;
}

export function isPayoutCurrency(raw: unknown): raw is PayoutCurrency {
  return normalizePayoutCurrency(raw) !== null;
}

export function parsePayoutCurrency(raw: unknown): PayoutCurrency {
  const currency = normalizePayoutCurrency(raw);
  if (!currency) {
    throw new Error("Withdrawal request has an unsupported currency");
  }
  return currency;
}

export function pendingPayoutField(currency: PayoutCurrency): string {
  return currency === "RWF" ? "pendingPayout" : `pendingPayout${currency}`;
}

export function pendingWithdrawalsField(currency: PayoutCurrency): string {
  return `pendingWithdrawals.${currency}`;
}

export function totalEarningsField(currency: PayoutCurrency): string {
  return currency === "RWF" ? "totalEarnings" : `totalEarnings${currency}`;
}
