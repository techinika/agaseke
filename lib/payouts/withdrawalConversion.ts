import { adminDb } from "@/db/firebaseAdmin";
import {
  FxError,
  MoneyError,
  convertMinorUnits,
  createFxQuote,
  deriveCrossRate,
  isSnapshotFresh,
  money,
  parseFxSnapshot,
  toMajor,
  type CurrencyCode,
  type FxSnapshot,
} from "@/lib/money";
import { PAYOUT_CURRENCIES, type PayoutCurrency } from "./currency";

export const WITHDRAWAL_QUOTE_TTL_SECONDS = 10 * 60;
const FX_RATE_MAX_AGE_MINUTES = 24 * 60;

export interface WithdrawalSourcePlan {
  currency: PayoutCurrency;
  amountMinor: number;
  amountMajor: number;
  payoutAmountMinor: number;
  payoutAmountMajor: number;
  rate: number;
  effectiveRate: number;
  spreadBps: number;
  fxRateId: string;
  rateSource: string;
  rateTimestamp: string;
}

export interface WithdrawalConversionPlan {
  id: string;
  creatorUid: string;
  creatorHandle: string;
  payoutCurrency: PayoutCurrency;
  requestedPayoutAmountMinor: number;
  requestedPayoutAmountMajor: number;
  totalSourceDebitMinorByCurrency: Record<string, number>;
  sources: WithdrawalSourcePlan[];
  expiresAt: string;
  createdAt: string;
}

export interface WithdrawalQuoteRequest {
  creatorUid: string;
  creatorHandle: string;
  payoutCurrency: PayoutCurrency;
  amount: unknown; // in payout currency
  availableByCurrency: Partial<Record<PayoutCurrency, number>>; // major units available per source
  spreadBps?: number;
  now?: Date;
}

function positiveMinor(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export async function loadFxSnapshot(): Promise<FxSnapshot> {
  const snap = await adminDb.collection("fxRates").doc("latest").get();
  if (!snap.exists) {
    throw new FxError("RATE_NOT_AVAILABLE", "Exchange rates are not available right now");
  }
  const snapshot = parseFxSnapshot(snap.data());
  if (!isSnapshotFresh(snapshot, new Date(), FX_RATE_MAX_AGE_MINUTES)) {
    throw new FxError("STALE_RATE", "Exchange rates are stale");
  }
  return snapshot;
}

function quoteId(): string {
  return `wq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a locked withdrawal conversion plan. Sources are consumed in a stable
 * order preferring same-currency, then other currencies by code. Each source
 * gets its own locked FX quote for auditability.
 */
export function planWithdrawalConversion(params: {
  id?: string;
  creatorUid: string;
  creatorHandle: string;
  payoutCurrency: PayoutCurrency;
  requestedPayoutAmountMinor: number;
  availableMinorByCurrency: Partial<Record<PayoutCurrency, number>>;
  snapshot: FxSnapshot;
  spreadBps: number;
  now?: Date;
  ttlSeconds?: number;
}): WithdrawalConversionPlan {
  const {
    creatorUid,
    creatorHandle,
    payoutCurrency,
    requestedPayoutAmountMinor,
    availableMinorByCurrency,
    snapshot,
    spreadBps,
  } = params;
  const now = params.now ?? new Date();
  const ttlSeconds = params.ttlSeconds ?? WITHDRAWAL_QUOTE_TTL_SECONDS;

  if (!Number.isSafeInteger(requestedPayoutAmountMinor) || requestedPayoutAmountMinor <= 0) {
    throw new FxError("INVALID_AMOUNT", "Withdrawal amount must be positive");
  }

  const orderedCurrencies = [
    payoutCurrency,
    ...PAYOUT_CURRENCIES.filter((c) => c !== payoutCurrency),
  ].filter((c, i, a) => a.indexOf(c) === i);

  let remainingPayoutMinor = requestedPayoutAmountMinor;
  const sources: WithdrawalSourcePlan[] = [];
  const totalSourceDebitMinorByCurrency: Record<string, number> = {};

  for (const sourceCurrency of orderedCurrencies) {
    if (remainingPayoutMinor <= 0) break;
    const available = positiveMinor(availableMinorByCurrency[sourceCurrency]);
    if (available <= 0) continue;

    if (sourceCurrency === payoutCurrency) {
      const take = Math.min(available, remainingPayoutMinor);
      sources.push({
        currency: sourceCurrency,
        amountMinor: take,
        amountMajor: toMajor(money(sourceCurrency as CurrencyCode, take)),
        payoutAmountMinor: take,
        payoutAmountMajor: toMajor(money(payoutCurrency as CurrencyCode, take)),
        rate: 1,
        effectiveRate: 1,
        spreadBps: 0,
        fxRateId: "",
        rateSource: "same_currency",
        rateTimestamp: now.toISOString(),
      });
      totalSourceDebitMinorByCurrency[sourceCurrency] =
        (totalSourceDebitMinorByCurrency[sourceCurrency] || 0) + take;
      remainingPayoutMinor -= take;
      continue;
    }

    // Convert as much of this source as needed for remaining payout amount.
    // effectiveRate gives payout units per 1 source unit after spread.
    const baseRate = deriveCrossRate(snapshot, sourceCurrency as CurrencyCode, payoutCurrency as CurrencyCode);
    const fxQuote = createFxQuote({
      purpose: "withdrawal",
      fromCurrency: sourceCurrency as CurrencyCode,
      toCurrency: payoutCurrency as CurrencyCode,
      sourceAmountMinor: available, // provisional for rate capture
      rate: baseRate,
      spreadBps,
      snapshot,
      now,
      ttlSeconds,
    });

    // How much source needed for remaining payout? payout = source * effectiveRateAdjusted
    // effectiveRate in FxQuote is baseRate*(1-spread) in terms of raw rate; target computed via convertMinorUnits with that rate.
    // We need inverse: find minimal sourceMinor such that converted >= remainingPayoutMinor, capped by available.
    let takeSource = available;
    const maxPayout = convertMinorUnits(available, sourceCurrency as CurrencyCode, payoutCurrency as CurrencyCode, fxQuote.effectiveRate);
    let payoutFromSource = maxPayout;
    if (maxPayout > remainingPayoutMinor) {
      // binary search minimal source giving >= remainingPayoutMinor
      let lo = 1, hi = available;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const got = convertMinorUnits(mid, sourceCurrency as CurrencyCode, payoutCurrency as CurrencyCode, fxQuote.effectiveRate);
        if (got >= remainingPayoutMinor) hi = mid; else lo = mid + 1;
      }
      takeSource = lo;
      payoutFromSource = convertMinorUnits(takeSource, sourceCurrency as CurrencyCode, payoutCurrency as CurrencyCode, fxQuote.effectiveRate);
    }

    if (takeSource <= 0 || payoutFromSource <= 0) continue;

    // Re-create quote with actual take amount for accurate stored amounts
    const actualQuote = createFxQuote({
      purpose: "withdrawal",
      fromCurrency: sourceCurrency as CurrencyCode,
      toCurrency: payoutCurrency as CurrencyCode,
      sourceAmountMinor: takeSource,
      rate: baseRate,
      spreadBps,
      snapshot,
      now,
      ttlSeconds,
    });

    sources.push({
      currency: sourceCurrency,
      amountMinor: takeSource,
      amountMajor: toMajor(money(sourceCurrency as CurrencyCode, takeSource)),
      payoutAmountMinor: actualQuote.targetAmountMinor,
      payoutAmountMajor: toMajor(money(payoutCurrency as CurrencyCode, actualQuote.targetAmountMinor)),
      rate: actualQuote.rate,
      effectiveRate: actualQuote.effectiveRate,
      spreadBps: actualQuote.spreadBps,
      fxRateId: actualQuote.id,
      rateSource: actualQuote.rateSource,
      rateTimestamp: actualQuote.rateTimestamp,
    });
    totalSourceDebitMinorByCurrency[sourceCurrency] =
      (totalSourceDebitMinorByCurrency[sourceCurrency] || 0) + takeSource;
    remainingPayoutMinor -= actualQuote.targetAmountMinor;
  }

  if (remainingPayoutMinor > 0) {
    throw new MoneyError("INSUFFICIENT_AVAILABLE_BALANCE", "Insufficient available balance across currencies for this withdrawal");
  }

  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  return {
    id: params.id || quoteId(),
    creatorUid,
    creatorHandle,
    payoutCurrency,
    requestedPayoutAmountMinor,
    requestedPayoutAmountMajor: toMajor(money(payoutCurrency as CurrencyCode, requestedPayoutAmountMinor)),
    totalSourceDebitMinorByCurrency,
    sources,
    expiresAt,
    createdAt,
  };
}

export function isWithdrawalPlanUsable(plan: WithdrawalConversionPlan, now = new Date()): boolean {
  if (plan.creatorUid === undefined) return false;
  const exp = Date.parse(plan.expiresAt);
  return Number.isFinite(exp) && exp > now.getTime();
}
