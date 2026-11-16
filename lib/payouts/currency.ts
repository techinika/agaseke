export const PAYOUT_CURRENCIES = ["RWF", "USD"] as const;

export type PayoutCurrency = (typeof PAYOUT_CURRENCIES)[number];

export function normalizePayoutCurrency(raw: unknown): PayoutCurrency | null {
  const currency = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return PAYOUT_CURRENCIES.includes(currency as PayoutCurrency)
    ? (currency as PayoutCurrency)
    : null;
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

export function pendingPayoutField(
  currency: PayoutCurrency,
): "pendingPayout" | "pendingPayoutUSD" {
  return currency === "USD" ? "pendingPayoutUSD" : "pendingPayout";
}

export function pendingWithdrawalsField(currency: PayoutCurrency): string {
  return `pendingWithdrawals.${currency}`;
}
