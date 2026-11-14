export const DEFAULT_CURRENCY = "RWF";

export type MoneyInput = number | string | null | undefined;

function toNumber(value: MoneyInput): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 1234 -> "1,234" */
export function formatNumber(value: MoneyInput, locale = "en-RW"): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

/** 1234 -> "1,234 RWF" (RWF is whole-number only). */
export function formatMoney(
  value: MoneyInput,
  currency = DEFAULT_CURRENCY,
  locale = "en-RW",
): string {
  const amount = formatNumber(value, locale);
  return currency ? `${amount} ${currency}` : amount;
}

/** "RWF 1,234" for tables where the currency leads. */
export function formatMoneyLeading(
  value: MoneyInput,
  currency = DEFAULT_CURRENCY,
  locale = "en-RW",
): string {
  const amount = formatNumber(value, locale);
  return currency ? `${currency} ${amount}` : amount;
}

/** Parse user input such as "1,000 RWF" or " 500 " into an integer. */
export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

/** Format the amount shown inside an input while typing. */
export function formatMoneyInput(value: MoneyInput, locale = "en-RW"): string {
  const n = toNumber(value);
  return n === 0 && value !== 0 && value !== "0" ? "" : formatNumber(n, locale);
}
