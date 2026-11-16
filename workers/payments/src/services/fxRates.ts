import type { Env } from "../types";
import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "../money/registry.generated";
import {
  parseFxSnapshot,
  type FxSnapshot,
} from "../money/fx";
import { convertToFields, firestoreSet } from "../firestore";
import { logActivity } from "../logger";
import { createPaymentRepository } from "./repository";

const DEFAULT_REFRESH_MINUTES = 360;
const DEFAULT_MAX_AGE_MINUTES = 24 * 60;
const FETCH_TIMEOUT_MS = 15_000;

export interface RefreshFxResult {
  skipped: boolean;
  reason?: string;
  snapshot?: FxSnapshot;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ParsedRates {
  source: string;
  rates: Record<string, number>;
}

function parseCurrencyApi(payload: unknown, base: CurrencyCode): ParsedRates {
  if (!isRecord(payload)) throw new Error("Currency API returned an invalid payload");
  const table = payload[base.toLowerCase()];
  if (!isRecord(table)) throw new Error("Currency API payload is missing its rate table");

  const date = payload.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Currency API payload is missing its rate date");
  }

  return {
    source: "fawazahmed0-currency-api",
    rates: collectRates(table, base),
  };
}

function parseOpenErApi(payload: unknown, base: CurrencyCode): ParsedRates {
  if (!isRecord(payload) || payload.result !== "success") {
    throw new Error("ExchangeRate-API returned an unsuccessful payload");
  }
  if (!isRecord(payload.rates)) {
    throw new Error("ExchangeRate-API payload is missing rates");
  }

  return {
    source: "open-er-api",
    rates: collectRates(payload.rates, base),
  };
}

function collectRates(table: Record<string, unknown>, base: CurrencyCode): Record<string, number> {
  const rates: Record<string, number> = {};

  for (const code of CURRENCY_CODES) {
    if (code === base) continue;
    const value = table[code] ?? table[code.toLowerCase()];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rates[code] = value;
    }
  }

  const fetched = Object.keys(rates).length;
  if (fetched === 0) {
    throw new Error("Rate provider returned no usable registry currencies");
  }

  return rates;
}

async function fetchRates(
  base: CurrencyCode,
  fetchImpl: typeof fetch,
): Promise<ParsedRates> {
  const sources: Array<{ url: string; parse: (payload: unknown) => ParsedRates }> = [
    {
      url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.min.json`,
      parse: (payload) => parseCurrencyApi(payload, base),
    },
    {
      url: `https://open.er-api.com/v6/latest/${base}`,
      parse: (payload) => parseOpenErApi(payload, base),
    },
  ];

  const attempts: string[] = [];

  for (const source of sources) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetchImpl(source.url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      return source.parse(payload);
    } catch (error) {
      attempts.push(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Unable to fetch FX rates: ${attempts.join("; ")}`);
}

function latestPath(): string {
  return "fxRates/latest";
}

/**
 * Refresh the cached rate snapshot used by quotes. This is the only code path
 * that calls the FX provider; request paths read `fxRates/latest`.
 */
export async function refreshFxRates(
  env: Env,
  options: { fetchImpl?: typeof fetch; now?: Date; force?: boolean } = {},
): Promise<RefreshFxResult> {
  if (env.FX_RATES_ENABLED !== "true") {
    return { skipped: true, reason: "FX_RATES_ENABLED is not true" };
  }

  const now = options.now ?? new Date();
  const refreshMinutes = positiveInt(env.FX_RATE_REFRESH_MINUTES, DEFAULT_REFRESH_MINUTES);
  const maxAgeMinutes = positiveInt(env.FX_RATE_MAX_AGE_MINUTES, DEFAULT_MAX_AGE_MINUTES);
  const refreshMs = refreshMinutes * 60 * 1000;

  const repo = createPaymentRepository(env);

  if (!options.force) {
    try {
      const existing = await repo.get(latestPath());
      if (existing) {
        const snapshot = parseFxSnapshot(existing);
        if (now.getTime() - Date.parse(snapshot.fetchedAt) < refreshMs) {
          return { skipped: true, reason: "rate snapshot is still fresh", snapshot };
        }
      }
    } catch {
      // A malformed snapshot is replaced rather than trusted.
    }
  }

  const baseRaw = (env.FX_RATE_BASE || "USD").toUpperCase();
  if (!isCurrencyCode(baseRaw)) {
    throw new Error(`FX_RATE_BASE is not a registered currency: ${baseRaw}`);
  }
  const base = baseRaw;

  const parsed = await fetchRates(base, options.fetchImpl ?? globalThis.fetch);
  const fetchedAt = now.toISOString();
  const snapshot: FxSnapshot = {
    base,
    rates: parsed.rates,
    fetchedAt,
    source: parsed.source,
    expiresAt: new Date(now.getTime() + maxAgeMinutes * 60 * 1000).toISOString(),
  };

  const fields = convertToFields({
    base: snapshot.base,
    rates: snapshot.rates,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    expiresAt: snapshot.expiresAt,
  });

  const latest = await firestoreSet(env, latestPath(), fields);
  if (!latest) {
    throw new Error("Unable to write fxRates/latest");
  }

  const historyId = `fx_${now.getTime()}_${crypto.randomUUID().slice(0, 8)}`;
  await firestoreSet(env, `fxRateHistory/${historyId}`, fields);

  await logActivity(env, "info", "payment", "FX rates refreshed", {
    base,
    source: snapshot.source,
    currencies: Object.keys(snapshot.rates).length,
    fetchedAt,
  }).catch(() => {});

  return { skipped: false, snapshot };
}
