export type PayoutCurrency = "RWF" | "USD";

export function parsePayoutCurrency(raw: unknown): PayoutCurrency {
  const currency = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (currency !== "RWF" && currency !== "USD") {
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
