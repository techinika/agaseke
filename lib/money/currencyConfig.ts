import {
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "./registry.generated";

export interface CurrencyConfigInput {
  code: string;
  name?: string;
  symbol?: string;
  payoutThreshold: string | number;
  minSupportAmount: string | number;
  enabled?: boolean;
}

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  payoutThreshold: number;
  minSupportAmount: number;
  enabled: boolean;
}

export type CurrencyConfigValidation =
  { ok: true; value: CurrencyConfig } | { ok: false; error: string };

function parsePositiveMajorAmount(
  raw: string | number,
  minorUnit: number,
  field: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const text = String(raw).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return { ok: false, error: `${field} must be a positive amount` };
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: `${field} must be greater than zero` };
  }
  const decimals = text.includes(".") ? text.split(".")[1].length : 0;
  if (decimals > minorUnit) {
    return {
      ok: false,
      error: `${field} supports at most ${minorUnit} decimal places`,
    };
  }
  return { ok: true, value: amount };
}

export function validateCurrencyConfig(
  input: CurrencyConfigInput,
): CurrencyConfigValidation {
  const code = input.code.trim().toUpperCase();
  if (!isCurrencyCode(code)) {
    return { ok: false, error: `Unsupported currency code: ${code || "empty"}` };
  }

  const definition = getCurrencyDefinition(code);
  const threshold = parsePositiveMajorAmount(
    input.payoutThreshold,
    definition.minorUnit,
    "Payout threshold",
  );
  if (!threshold.ok) return threshold;

  const minSupport = parsePositiveMajorAmount(
    input.minSupportAmount,
    definition.minorUnit,
    "Minimum support",
  );
  if (!minSupport.ok) return minSupport;

  return {
    ok: true,
    value: {
      code,
      name: input.name?.trim() || definition.name,
      symbol: input.symbol?.trim() || definition.symbol,
      payoutThreshold: threshold.value,
      minSupportAmount: minSupport.value,
      enabled: input.enabled !== false,
    },
  };
}
