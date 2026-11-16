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
  enabled?: boolean;
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
  KES: "KSh",
  UGX: "USh",
  TZS: "TSh",
  NGN: "₦",
  GHS: "GH₵",
  ZAR: "R",
  EGP: "E£",
  MAD: "MAD",
  DZD: "DZD",
  TND: "TND",
  XOF: "CFA",
  XAF: "FCFA",
  ETB: "Br",
  CDF: "FC",
  AOA: "Kz",
  MZN: "MT",
  ZMW: "ZK",
  MWK: "MK",
  BWP: "P",
  NAD: "N$",
  LSL: "L",
  SZL: "E",
  MUR: "MUR",
  SCR: "SCR",
  MGA: "Ar",
  KMF: "KMF",
  BIF: "BIF",
  DJF: "DJF",
  SOS: "SOS",
  SSP: "SSP",
  SDG: "SDG",
  LYD: "LYD",
  MRU: "MRU",
  GMD: "D",
  GNF: "GNF",
  LRD: "L$",
  SLE: "Le",
  CVE: "Esc",
  STN: "Db",
  ERN: "Nfk",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  CNY: "¥",
  JPY: "¥",
  AUD: "A$",
  CHF: "CHF",
  INR: "₹",
  AED: "AED",
  SAR: "SAR",
  BRL: "R$",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${amount.toLocaleString()} ${symbol}`;
}

export function displayAmount(
  amount: number | undefined | null,
  currency?: string | null,
): string {
  if (amount == null) return "-";
  if (currency) {
    return `${amount.toLocaleString()} ${getCurrencySymbol(currency)}`;
  }
  return `${amount.toLocaleString()} (currency not recorded)`;
}
