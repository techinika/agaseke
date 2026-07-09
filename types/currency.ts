export interface Country {
  id: string;
  code: string;
  name: string;
  flag?: string;
  phoneCode?: string;
  createdAt: any;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  payoutThreshold: number;
  minSupportAmount: number;
  createdAt: any;
}

export interface CountryCurrency {
  id: string;
  countryCode: string;
  currencyCode: string;
  isDefault: boolean;
  createdAt: any;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const DEFAULT_CURRENCY = "RWF";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RWF: "FRw",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KES: "KSh",
  TZS: "TSh",
  UGX: "USh",
  NGN: "₦",
  ZAR: "R",
  GHS: "GH₵",
  XAF: "FCFA",
  XOF: "CFA",
  CNY: "¥",
  JPY: "¥",
  INR: "₹",
  BRL: "R$",
  AED: "د.إ",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${amount.toLocaleString()} ${symbol}`;
}

export function displayAmount(amount: number | undefined | null, currency?: string | null): string {
  if (amount == null) return "-";
  if (currency) {
    return `${amount.toLocaleString()} ${getCurrencySymbol(currency)}`;
  }
  return `${amount.toLocaleString()} (currency not recorded)`;
}
