import { isCurrencyCode } from "./registry.generated";

/**
 * December 1, 2026 UTC marks the multi-currency transition boundary.
 * Records missing an explicit currency field created before this cutoff (or
 * legacy records lacking a timestamp) originally settled in RWF.
 * Records that already store a valid currency (for example "USD") ALWAYS
 * preserve that explicit currency and are never forced to RWF.
 */
export const PRE_MULTI_CURRENCY_CUTOFF_ISO = "2026-12-01T00:00:00.000Z";
export const PRE_MULTI_CURRENCY_CUTOFF_MS = Date.parse(PRE_MULTI_CURRENCY_CUTOFF_ISO);

export function normalizeValidCurrency(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const code = raw.trim().toUpperCase();
  if (!code) return "";
  return isCurrencyCode(code) ? code : "";
}

export function parseTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toMillis === "function") {
      const ms = (record.toMillis as () => number)();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof record.toDate === "function") {
      const d = (record.toDate as () => Date)();
      if (d instanceof Date) {
        const ms = d.getTime();
        return Number.isFinite(ms) ? ms : null;
      }
    }
    if (typeof record.seconds === "number") {
      return record.seconds * 1000;
    }
    if (typeof record._seconds === "number") {
      return record._seconds * 1000;
    }
  }
  return null;
}

export function getRecordTimestampMs(
  record: Record<string, unknown> | null | undefined,
): number | null {
  if (!record) return null;
  return (
    parseTimestampMs(record.createdAt) ??
    parseTimestampMs(record.successfulAt) ??
    parseTimestampMs(record.appliedAt) ??
    parseTimestampMs(record.updatedAt) ??
    null
  );
}

/**
 * Resolve the true currency for a historical record (transaction, sale, order,
 * support, payout, withdraw request, ticket sale, or coupon):
 *
 * 1. Explicit valid currency (`currency`, `payoutCurrency`, `chargeCurrency`)
 *    is ALWAYS preserved unchanged (e.g. an existing "USD" record stays "USD").
 * 2. If missing and created before Dec 1, 2026 (or lacking any timestamp), it
 *    resolves to "RWF" (the platform's original single currency).
 * 3. Never blindly falls back to the creator's current display currency setting.
 */
export function resolveHistoricalCurrency(
  record: Record<string, unknown> | null | undefined,
  options?: {
    fallbackCurrency?: string;
    cutoffMs?: number;
  },
): string {
  if (record) {
    const explicit =
      normalizeValidCurrency(record.currency) ||
      normalizeValidCurrency(record.payoutCurrency) ||
      normalizeValidCurrency(record.chargeCurrency);
    if (explicit) return explicit;
  }

  const cutoffMs = options?.cutoffMs ?? PRE_MULTI_CURRENCY_CUTOFF_MS;
  const tsMs = getRecordTimestampMs(record);
  if (tsMs === null || tsMs < cutoffMs) {
    return "RWF";
  }

  return normalizeValidCurrency(options?.fallbackCurrency);
}
