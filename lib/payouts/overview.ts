import {
  applySpreadMinor,
  convertMinorUnits,
  deriveCrossRate,
  fromMajor,
  money,
  toMajor,
  type CurrencyCode,
  type FxSnapshot,
} from "@/lib/money";
import {
  normalizePayoutCurrency,
  PAYOUT_CURRENCIES,
  type PayoutCurrency,
} from "./currency";

export interface PayoutCurrencyPolicy {
  code?: unknown;
  payoutThreshold?: unknown;
}

export interface CurrencyBalance {
  currency: PayoutCurrency;
  pending: number;
  convertiblePending?: number;
  threshold: number | null;
  earnings: number;
}

export interface PayoutOverview {
  creatorCurrency: PayoutCurrency;
  withdrawThreshold: number | null;
  perCurrencyBalances: CurrencyBalance[];
}

function finiteNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildPayoutOverview(
  creator: Record<string, unknown>,
  policies: PayoutCurrencyPolicy[],
): PayoutOverview {
  const creatorCurrency = normalizePayoutCurrency(creator.currency);
  const configured = new Map<PayoutCurrency, PayoutCurrencyPolicy>();
  for (const policy of policies) {
    const code = normalizePayoutCurrency(policy.code);
    if (code && !configured.has(code)) configured.set(code, policy);
  }

  const configuredCodes = PAYOUT_CURRENCIES.filter((code) => configured.has(code));
  const displayedCodes: PayoutCurrency[] =
    configuredCodes.length > 0
      ? [...configuredCodes]
      : creatorCurrency
        ? [creatorCurrency]
        : [...PAYOUT_CURRENCIES];
  if (creatorCurrency && !displayedCodes.includes(creatorCurrency)) {
    displayedCodes.unshift(creatorCurrency);
  }
  for (const key of Object.keys(creator || {})) {
    const m = key.match(/^pendingPayout([A-Z]{3})$/) || key.match(/^totalEarnings([A-Z]{3})$/);
    if (m && !displayedCodes.includes(m[1] as PayoutCurrency)) displayedCodes.push(m[1] as PayoutCurrency);
  }

  const held =
    creator.pendingWithdrawals && typeof creator.pendingWithdrawals === "object"
      ? (creator.pendingWithdrawals as Record<string, unknown>)
      : {};
  const pendingFor = (code: PayoutCurrency) =>
    Math.max(
      0,
      finiteNumber(
        code === "RWF" ? creator.pendingPayout : creator[`pendingPayout${code}`],
      ) - finiteNumber(held[code]),
    );
  const earningsFor = (code: PayoutCurrency) =>
    finiteNumber(
      code === "RWF" ? creator.totalEarnings : creator[`totalEarnings${code}`],
    );
  const thresholdFor = (code: PayoutCurrency): number | null => {
    const value = Number(configured.get(code)?.payoutThreshold);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const selectedCurrency =
    creatorCurrency && displayedCodes.includes(creatorCurrency)
      ? creatorCurrency
      : displayedCodes[0];

  return {
    creatorCurrency: selectedCurrency,
    withdrawThreshold: thresholdFor(selectedCurrency),
    perCurrencyBalances: displayedCodes.map((code) => ({
      currency: code,
      pending: pendingFor(code),
      threshold: thresholdFor(code),
      earnings: earningsFor(code),
    })),
  };
}

export function enrichPayoutOverviewWithFx(
  overview: PayoutOverview,
  snapshot: FxSnapshot | null,
  spreadBps = 150,
): PayoutOverview {
  if (!snapshot) return overview;
  const safeSpread = Math.max(0, Math.min(9999, Math.trunc(spreadBps)));

  return {
    ...overview,
    perCurrencyBalances: overview.perCurrencyBalances.map((target) => {
      let totalTargetMinor = 0;
      for (const source of overview.perCurrencyBalances) {
        if (!Number.isFinite(source.pending) || source.pending <= 0) continue;
        try {
          const sourceMoney = fromMajor(source.currency as CurrencyCode, source.pending);
          if (sourceMoney.amountMinor <= 0) continue;
          if (source.currency === target.currency) {
            totalTargetMinor += sourceMoney.amountMinor;
            continue;
          }
          const rate = deriveCrossRate(
            snapshot,
            source.currency as CurrencyCode,
            target.currency as CurrencyCode,
          );
          const converted = convertMinorUnits(
            sourceMoney.amountMinor,
            source.currency as CurrencyCode,
            target.currency as CurrencyCode,
            rate,
          );
          totalTargetMinor += applySpreadMinor(converted, safeSpread, "withdrawal");
        } catch {
          // Skip source currency if conversion rate or precision is unavailable
        }
      }
      return {
        ...target,
        convertiblePending: toMajor(
          money(target.currency as CurrencyCode, totalTargetMinor),
        ),
      };
    }),
  };
}
