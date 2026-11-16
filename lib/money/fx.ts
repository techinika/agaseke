import {
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "./registry.generated";

const DEFAULT_MAX_AGE_MINUTES = 24 * 60;
const DEFAULT_QUOTE_TTL_SECONDS = 10 * 60;

export type FxErrorCode =
  | "INVALID_SNAPSHOT"
  | "STALE_RATE"
  | "RATE_NOT_AVAILABLE"
  | "INVALID_RATE"
  | "INVALID_AMOUNT"
  | "INVALID_SPREAD"
  | "QUOTE_EXPIRED";

export class FxError extends Error {
  readonly code: FxErrorCode;

  constructor(code: FxErrorCode, message: string) {
    super(message);
    this.name = "FxError";
    this.code = code;
  }
}

/** Cached rate table. Rates are quote-per-`base`, never the inverse unless documented. */
export interface FxSnapshot {
  readonly base: CurrencyCode;
  readonly rates: Readonly<Record<string, number>>;
  readonly fetchedAt: string;
  readonly source: string;
  readonly expiresAt?: string;
}

export type FxQuotePurpose = "checkout" | "withdrawal";

export interface FxQuoteInput {
  readonly id?: string;
  readonly purpose: FxQuotePurpose;
  readonly fromCurrency: CurrencyCode;
  readonly toCurrency: CurrencyCode;
  readonly sourceAmountMinor: number;
  readonly rate: number;
  readonly spreadBps: number;
  readonly snapshot: FxSnapshot;
  readonly now?: Date;
  readonly ttlSeconds?: number;
}

export interface FxQuote {
  readonly id: string;
  readonly purpose: FxQuotePurpose;
  readonly fromCurrency: CurrencyCode;
  readonly toCurrency: CurrencyCode;
  readonly sourceAmountMinor: number;
  readonly targetAmountMinor: number;
  readonly rate: number;
  readonly effectiveRate: number;
  readonly base: CurrencyCode;
  readonly rateSource: string;
  readonly rateTimestamp: string;
  readonly spreadBps: number;
  readonly createdAt: string;
  readonly expiresAt: string;
}

function parseTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new FxError("INVALID_SNAPSHOT", `FX snapshot ${field} is invalid`);
  }
  return value;
}

function readRate(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Normalize a Firestore or API rate document. Unknown currencies are dropped so
 * an old snapshot cannot silently price a newly added currency.
 */
export function parseFxSnapshot(raw: unknown): FxSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new FxError("INVALID_SNAPSHOT", "FX snapshot is missing");
  }

  const record = raw as Record<string, unknown>;
  const base = record.base;
  if (!isCurrencyCode(base)) {
    throw new FxError("INVALID_SNAPSHOT", "FX snapshot base currency is invalid");
  }
  if (!record.rates || typeof record.rates !== "object" || Array.isArray(record.rates)) {
    throw new FxError("INVALID_SNAPSHOT", "FX snapshot rates are missing");
  }

  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(record.rates as Record<string, unknown>)) {
    if (!isCurrencyCode(code)) continue;
    const rate = readRate(value);
    if (rate > 0) rates[code] = rate;
  }

  const fetchedAt = parseTimestamp(record.fetchedAt, "fetchedAt");
  const source =
    typeof record.source === "string" && record.source.trim()
      ? record.source.trim()
      : "unknown";
  const expiresAt =
    record.expiresAt === undefined || record.expiresAt === null
      ? undefined
      : parseTimestamp(record.expiresAt, "expiresAt");

  return { base, rates, fetchedAt, source, expiresAt };
}

export function snapshotMaxAgeMs(maxAgeMinutes = DEFAULT_MAX_AGE_MINUTES): number {
  return Math.max(1, maxAgeMinutes) * 60 * 1000;
}

/**
 * A snapshot with no `expiresAt` is fresh for `maxAgeMinutes` from `fetchedAt`.
 * There is intentionally no last-known-rate fallback.
 */
export function isSnapshotFresh(
  snapshot: FxSnapshot,
  now: Date = new Date(),
  maxAgeMinutes = DEFAULT_MAX_AGE_MINUTES,
): boolean {
  const nowMs = now.getTime();
  const fetchedMs = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(fetchedMs) || fetchedMs > nowMs + 60_000) return false;
  if (fetchedMs + snapshotMaxAgeMs(maxAgeMinutes) <= nowMs) return false;

  if (snapshot.expiresAt) {
    const expiryMs = Date.parse(snapshot.expiresAt);
    if (!Number.isFinite(expiryMs) || expiryMs <= nowMs) return false;
  }

  return true;
}

/**
 * Derive a cross rate through the snapshot base. There is no undocumented
 * direct-pair shortcut; missing rates fail closed.
 */
export function deriveCrossRate(
  snapshot: FxSnapshot,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (!isCurrencyCode(from) || !isCurrencyCode(to)) {
    throw new FxError("RATE_NOT_AVAILABLE", "Unknown currency in FX conversion");
  }
  if (from === to) return 1;

  if (from === snapshot.base) {
    const rate = readRate(snapshot.rates[to]);
    if (rate > 0) return rate;
    throw new FxError("RATE_NOT_AVAILABLE", `No ${to} rate in the FX snapshot`);
  }

  if (to === snapshot.base) {
    const rate = readRate(snapshot.rates[from]);
    if (rate > 0) return 1 / rate;
    throw new FxError("RATE_NOT_AVAILABLE", `No ${from} rate in the FX snapshot`);
  }

  const fromRate = readRate(snapshot.rates[from]);
  const toRate = readRate(snapshot.rates[to]);
  if (fromRate <= 0 || toRate <= 0) {
    throw new FxError(
      "RATE_NOT_AVAILABLE",
      `No ${fromRate > 0 ? to : from} rate in the FX snapshot`,
    );
  }

  return toRate / fromRate;
}

function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Math.abs(value));
  return value < 0 ? -rounded : rounded;
}

export function minorUnitScale(currency: CurrencyCode): number {
  return 10 ** getCurrencyDefinition(currency).minorUnit;
}

export function convertMinorUnits(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new FxError("INVALID_AMOUNT", "Amount must be an integer of minor units");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new FxError("INVALID_RATE", "FX rate must be positive and finite");
  }

  const raw = (amountMinor * rate * minorUnitScale(to)) / minorUnitScale(from);
  const converted = roundHalfAwayFromZero(raw);
  if (!Number.isSafeInteger(converted)) {
    throw new FxError("INVALID_AMOUNT", "Converted amount is outside the safe range");
  }
  return converted;
}

export function validateSpread(spreadBps: number): void {
  if (!Number.isSafeInteger(spreadBps) || spreadBps < 0 || spreadBps >= 10_000) {
    throw new FxError(
      "INVALID_SPREAD",
      `FX spread must be an integer from 0 to 9999 bps, got ${spreadBps}`,
    );
  }
}

/**
 * Checkout: the supporter pays the converted amount plus the spread.
 * Withdrawal: the creator receives the converted amount minus the spread.
 */
export function applySpreadMinor(
  amountMinor: number,
  spreadBps: number,
  purpose: FxQuotePurpose,
): number {
  validateSpread(spreadBps);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new FxError("INVALID_AMOUNT", "Amount must be an integer of minor units");
  }

  const factor =
    purpose === "checkout" ? 1 + spreadBps / 10_000 : 1 - spreadBps / 10_000;
  const result = roundHalfAwayFromZero(amountMinor * factor);
  if (result <= 0 && amountMinor > 0) {
    throw new FxError("INVALID_AMOUNT", "FX spread consumes the whole amount");
  }
  return result;
}

export function isQuoteUsable(quote: FxQuote, now: Date = new Date()): boolean {
  const expiry = Date.parse(quote.expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

/**
 * Build a locked quote. The caller persists it and treats `targetAmountMinor`
 * as authoritative until `expiresAt`; the client must never recompute it.
 */
export function createFxQuote(input: FxQuoteInput): FxQuote {
  if (!isCurrencyCode(input.fromCurrency) || !isCurrencyCode(input.toCurrency)) {
    throw new FxError("RATE_NOT_AVAILABLE", "Unknown quote currency");
  }
  if (!Number.isSafeInteger(input.sourceAmountMinor) || input.sourceAmountMinor <= 0) {
    throw new FxError("INVALID_AMOUNT", "Quote amount must be a positive integer");
  }
  validateSpread(input.spreadBps);

  const now = input.now ?? new Date();
  if (!isSnapshotFresh(input.snapshot, now)) {
    throw new FxError("STALE_RATE", "FX rate is stale; a new quote is required");
  }

  const rate =
    input.fromCurrency === input.toCurrency
      ? 1
      : deriveCrossRate(input.snapshot, input.fromCurrency, input.toCurrency);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new FxError("INVALID_RATE", "Derived FX rate is invalid");
  }

  const converted = convertMinorUnits(
    input.sourceAmountMinor,
    input.fromCurrency,
    input.toCurrency,
    rate,
  );
  const targetAmountMinor =
    input.fromCurrency === input.toCurrency
      ? input.sourceAmountMinor
      : applySpreadMinor(converted, input.spreadBps, input.purpose);

  if (!Number.isSafeInteger(targetAmountMinor) || targetAmountMinor <= 0) {
    throw new FxError("INVALID_AMOUNT", "Quoted target amount is invalid");
  }

  const ttlSeconds = Math.max(1, input.ttlSeconds ?? DEFAULT_QUOTE_TTL_SECONDS);
  const ttlExpiry = now.getTime() + ttlSeconds * 1000;
  const snapshotExpiry = input.snapshot.expiresAt
    ? Date.parse(input.snapshot.expiresAt)
    : Number.POSITIVE_INFINITY;
  const expiresAtMs = Math.min(ttlExpiry, snapshotExpiry);

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()) {
    throw new FxError("STALE_RATE", "FX rate expires before a quote can be used");
  }

  return {
    id: input.id ?? crypto.randomUUID(),
    purpose: input.purpose,
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    sourceAmountMinor: input.sourceAmountMinor,
    targetAmountMinor,
    rate,
    effectiveRate:
      input.sourceAmountMinor > 0 ? targetAmountMinor / input.sourceAmountMinor : rate,
    base: input.snapshot.base,
    rateSource: input.snapshot.source,
    rateTimestamp: input.snapshot.fetchedAt,
    spreadBps: input.spreadBps,
    createdAt: now.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
