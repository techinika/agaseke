"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  CURRENCY_CODES,
  getCurrencyDefinition,
  type CurrencyCode,
} from "@/lib/money/registry.generated";
import { buildPriceMap, type PriceMap } from "@/lib/priceMap";

interface PriceEditorProps {
  currency: CurrencyCode;
  prices: PriceMap;
  onChange: (next: { currency: CurrencyCode; prices: PriceMap }) => void;
  label?: string;
  preferredCurrencies?: CurrencyCode[];
}

function uniqueCodes(codes: CurrencyCode[]): CurrencyCode[] {
  return [...new Set(codes)].filter((c): c is CurrencyCode =>
    (CURRENCY_CODES as readonly string[]).includes(c),
  );
}

function formatStep(minorUnit: number): string {
  if (minorUnit <= 0) return "1";
  return `0.${"0".repeat(Math.max(0, minorUnit - 1))}1`;
}

export default function PriceEditor({
  currency,
  prices,
  onChange,
  label = "Prices",
  preferredCurrencies = [],
}: PriceEditorProps) {
  const [extraCodes, setExtraCodes] = useState<CurrencyCode[]>([]);

  const pricedCodes = useMemo(
    () =>
      (Object.entries(prices) as [CurrencyCode, number][])
        .filter(
          ([code, value]) =>
            (CURRENCY_CODES as readonly string[]).includes(code) &&
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0,
        )
        .map(([code]) => code),
    [prices],
  );

  const rows = useMemo(
    () => uniqueCodes([currency, ...extraCodes, ...pricedCodes]),
    [currency, extraCodes, pricedCodes],
  );

  const allOptions = useMemo(
    () =>
      uniqueCodes([
        currency,
        ...preferredCurrencies,
        "RWF",
        "USD",
        ...(CURRENCY_CODES as unknown as CurrencyCode[]),
      ]),
    [currency, preferredCurrencies],
  );

  const availableToAdd = allOptions.filter((code) => !rows.includes(code));

  const emit = (nextCurrency: CurrencyCode, nextPrices: PriceMap) => {
    onChange({ currency: nextCurrency, prices: buildPriceMap({ prices: nextPrices }) });
  };

  const setAmount = (code: CurrencyCode, raw: string) => {
    const next: PriceMap = { ...prices };
    if (raw === "") {
      delete next[code];
      emit(currency, next);
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    if (value <= 0) delete next[code];
    else next[code] = value;
    emit(currency, next);
  };

  const setPrimary = (code: CurrencyCode) => {
    if (!rows.includes(code)) setExtraCodes((prev) => uniqueCodes([...prev, code]));
    emit(code, prices);
  };

  const addCurrency = (code: CurrencyCode) => {
    if (!code || rows.includes(code)) return;
    setExtraCodes((prev) => uniqueCodes([...prev, code]));
  };

  const removeCurrency = (code: CurrencyCode) => {
    const next: PriceMap = { ...prices };
    delete next[code];
    setExtraCodes((prev) => prev.filter((c) => c !== code));
    let nextPrimary = currency;
    if (code === currency) {
      nextPrimary = (rows.find((c) => c !== code) || currency) as CurrencyCode;
    }
    emit(nextPrimary, next);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
          Primary currency
        </label>
        <select
          value={currency}
          onChange={(e) => setPrimary(e.target.value as CurrencyCode)}
          className="w-full bg-muted p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
        >
          {allOptions.map((code) => (
            <option key={code} value={code}>
              {code} — {getCurrencyDefinition(code).name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Set an explicit price for each currency you want to offer. Buyers are charged in a supported currency; explicit prices avoid FX conversion.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest block">
          {label}
        </label>
        {rows.map((code) => {
          const def = getCurrencyDefinition(code);
          const value = prices[code];
          const isPrimary = code === currency;
          const missingPrimary = isPrimary && !(typeof value === "number" && value > 0);
          return (
            <div key={code} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-16 shrink-0 inline-flex justify-center px-2 py-1 rounded-md text-xs font-bold ${
                    isPrimary ? "bg-brand-soft text-brand-strong" : "bg-muted text-muted-foreground"
                  }`}
                  title={isPrimary ? "Primary/listing currency" : undefined}
                >
                  {code}
                </span>
                <input
                  type="number"
                  min={0}
                  step={formatStep(def.minorUnit)}
                  value={value !== undefined && value !== null && value > 0 ? value : ""}
                  onChange={(e) => setAmount(code, e.target.value)}
                  placeholder={isPrimary ? `Required (${code})` : "Amount"}
                  className={`flex-1 bg-muted p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 ${
                    missingPrimary
                      ? "border border-danger/60 focus:ring-danger/20"
                      : "focus:ring-brand-soft"
                  }`}
                />
                <span className="text-xs text-muted-foreground w-12 shrink-0 truncate" title={def.name}>
                  {def.symbol ?? code}
                </span>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeCurrency(code)}
                    className="p-2 text-muted-foreground hover:text-danger hover:bg-danger-bg rounded-lg"
                    aria-label={`Remove ${code}`}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <div className="w-8" />
                )}
              </div>
              {missingPrimary && pricedCodes.length > 0 && (
                <p className="text-caption font-medium text-danger pl-18">
                  Enter your price in {code} (or remove unused currencies).
                </p>
              )}
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            const code = e.target.value as CurrencyCode;
            if (code) addCurrency(code);
            e.currentTarget.value = "";
          }}
          className="bg-card border border-border p-2.5 rounded-lg text-sm font-medium outline-none"
        >
          <option value="">Add another currency price…</option>
          {availableToAdd.map((code) => (
            <option key={code} value={code}>
              {code} — {getCurrencyDefinition(code).name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
