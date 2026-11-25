import crypto from "crypto";
import { adminDb } from "@/db/firebaseAdmin";
import {
  CURRENCY_CODES,
  fetchDailyRates,
  isCurrencyCode,
  type CurrencyCode,
  type FxSnapshot,
} from "@/lib/money";

export interface SyncFxRatesOptions {
  base?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  maxAgeMinutes?: number;
  actorUid?: string | null;
  actorEmail?: string | null;
}

export interface SyncFxRatesResult {
  snapshot: FxSnapshot;
  rateCount: number;
  historyId: string;
}

export async function syncLatestFxRates(
  options: SyncFxRatesOptions = {},
): Promise<SyncFxRatesResult> {
  const now = options.now ?? new Date();
  const baseCandidate = (options.base || process.env.FX_RATE_BASE || "USD").toUpperCase();
  if (!isCurrencyCode(baseCandidate)) {
    throw new Error(`FX_RATE_BASE is not a registered currency: ${baseCandidate}`);
  }
  const base: CurrencyCode = baseCandidate;

  const quotes = CURRENCY_CODES.filter((code) => code !== base);
  const maxAgeMinutes = Math.max(
    1,
    Math.trunc(
      options.maxAgeMinutes ?? Number(process.env.FX_RATE_MAX_AGE_MINUTES || 24 * 60),
    ),
  );

  const fetched = await fetchDailyRates({
    base,
    quotes,
    fetchImpl: options.fetchImpl,
  });

  const rates: Record<string, number> = {};
  for (const entry of fetched.rates) {
    rates[entry.quote] = entry.rate;
  }

  const fetchedAt = now.toISOString();
  const snapshot: FxSnapshot = {
    base,
    rates,
    fetchedAt,
    source: fetched.source.id === "frankfurter-dev" ? "frankfurter.dev" : fetched.source.id,
    expiresAt: new Date(now.getTime() + maxAgeMinutes * 60 * 1000).toISOString(),
  };

  const docPayload = {
    base: snapshot.base,
    rates: snapshot.rates,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    expiresAt: snapshot.expiresAt,
  };

  const historyId = `fx_${now.getTime()}_${crypto.randomUUID().slice(0, 8)}`;

  await Promise.all([
    adminDb.collection("fxRates").doc("latest").set(docPayload),
    adminDb.collection("fxRateHistory").doc(historyId).set(docPayload),
    adminDb
      .collection("activityLogs")
      .add({
        level: "info",
        category: "payment",
        message: `FX rates refreshed from ${snapshot.source}`,
        base: snapshot.base,
        source: snapshot.source,
        currencies: Object.keys(snapshot.rates).length,
        actorUid: options.actorUid ?? null,
        actorEmail: options.actorEmail ?? null,
        fetchedAt,
        createdAt: now,
      })
      .catch(() => {}),
  ]);

  return {
    snapshot,
    rateCount: Object.keys(snapshot.rates).length,
    historyId,
  };
}
