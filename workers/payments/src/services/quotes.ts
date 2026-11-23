import type { Env, InitRequest } from "../types";
import {
  isCurrencyCode,
  type CurrencyCode,
} from "../money/registry.generated";
import {
  FxError,
  createFxQuote,
  isSnapshotFresh,
  isQuoteUsable,
  parseFxSnapshot,
  type FxQuote,
} from "../money/fx";
import { toMinorUnits, fromMinorUnits } from "../money/amount";
import { convertToFields, firestoreSet, firestoreUpdateFields } from "../firestore";
import {
  PaymentRequestError,
  resolvePayment,
  type ResolvedPayment,
  type ResolvedPaymentQuote,
} from "./pricing";
import type { PaymentRepository } from "./pricing";

const DEFAULT_QUOTE_TTL_SECONDS = 10 * 60;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Price-relevant request fields. Metadata such as a support message is not part
 * of the quote; changing quantity, the item or the coupon invalidates it.
 */
export function quoteRequestKey(body: InitRequest): string {
  const raw = body as unknown as Record<string, unknown>;
  const normalizedItems = Array.isArray(body.items) && body.items.length > 0
    ? body.items
        .map((item) => ({
          productId: str(item?.productId),
          quantity: Number(item?.quantity) || 1,
          selectedSize: str(item?.selectedSize),
        }))
        .sort((a, b) =>
          `${a.productId}:${a.selectedSize}`.localeCompare(`${b.productId}:${b.selectedSize}`),
        )
    : undefined;
  return JSON.stringify({
    creatorHandle: str(raw.creatorHandle) || str(raw.creatorId),
    type: str(raw.type),
    productId: str(raw.productId),
    quantity: raw.quantity === undefined ? "" : str(raw.quantity),
    selectedSize: str(raw.selectedSize),
    ...(normalizedItems ? { items: normalizedItems } : {}),
    ...(str(raw.orderId) ? { orderId: str(raw.orderId) } : {}),
    couponCode: str(raw.couponCode).toUpperCase(),
    bookingId: str(raw.bookingId),
    gatheringId: str(raw.gatheringId),
    communityTierId: str(raw.communityTierId),
    communityInterval: str(raw.communityInterval),
    communitySubscriptionId: str(raw.communitySubscriptionId),
  });
}

export interface CreatedCheckoutQuote {
  native: ResolvedPayment;
  quote: FxQuote | null;
  sourceAmount: number;
  targetAmount: number | null;
}

function asPaymentError(error: unknown): PaymentRequestError {
  if (error instanceof PaymentRequestError) return error;
  if (error instanceof FxError) {
    return new PaymentRequestError(error.code, error.message);
  }
  return new PaymentRequestError(
    "QUOTE_FAILED",
    error instanceof Error ? error.message : "Unable to create a quote",
  );
}

/**
 * Build and persist a locked checkout quote. The request path only reads the
 * cached `fxRates/latest`; it never calls the rate provider.
 */
export async function createCheckoutQuote(
  env: Env,
  body: InitRequest,
  uid: string,
  repo: PaymentRepository,
  now: Date = new Date(),
): Promise<CreatedCheckoutQuote> {
  const requestedRaw = str(body.currency).toUpperCase();
  if (!requestedRaw) {
    throw new PaymentRequestError(
      "MISSING_CURRENCY",
      "Choose the currency you want to pay in",
    );
  }
  if (!isCurrencyCode(requestedRaw)) {
    throw new PaymentRequestError(
      "UNSUPPORTED_CURRENCY",
      `Unsupported currency: ${requestedRaw}`,
    );
  }
  const targetCurrency = requestedRaw;

  const nativeBody: InitRequest = { ...body, currency: undefined };
  const native = await resolvePayment(env, nativeBody, uid, repo);

  if (native.type === "support" || native.type === "gift") {
    throw new PaymentRequestError(
      "QUOTE_NOT_APPLICABLE",
      "Free-amount support is charged directly in the chosen currency",
    );
  }
  if (native.currency === targetCurrency) {
    return {
      native,
      quote: null,
      sourceAmount: native.totalAmount,
      targetAmount: native.totalAmount,
    };
  }

  const maxAgeMinutes = positiveInt(env.FX_RATE_MAX_AGE_MINUTES, 24 * 60);
  const ttlSeconds = positiveInt(env.FX_QUOTE_TTL_SECONDS, DEFAULT_QUOTE_TTL_SECONDS);
  const spreadBps = Math.max(
    0,
    Math.min(9_999, Math.trunc(Number(env.FX_SPREAD_BPS) || 0)),
  );

  const snapshotRaw = await repo.get("fxRates/latest");
  if (!snapshotRaw) {
    throw new PaymentRequestError(
      "FX_RATE_UNAVAILABLE",
      "Exchange rates are not available right now",
      503,
    );
  }

  try {
    const snapshot = parseFxSnapshot(snapshotRaw);
    if (!isSnapshotFresh(snapshot, now, maxAgeMinutes)) {
      throw new FxError("STALE_RATE", "Exchange rates are stale");
    }

    const sourceCurrency = native.currency as CurrencyCode;
    const sourceAmountMinor = toMinorUnits(native.totalAmount, sourceCurrency);
    const quote = createFxQuote({
      purpose: "checkout",
      fromCurrency: sourceCurrency,
      toCurrency: targetCurrency,
      sourceAmountMinor,
      rate: 1,
      spreadBps,
      snapshot,
      now,
      ttlSeconds,
    });

    const stored = await firestoreSet(
      env,
      `fxQuotes/${quote.id}`,
      convertToFields({
        id: quote.id,
        uid,
        purpose: quote.purpose,
        status: "active",
        requestKey: quoteRequestKey(nativeBody),
        fromCurrency: quote.fromCurrency,
        toCurrency: quote.toCurrency,
        sourceAmountMinor: quote.sourceAmountMinor,
        targetAmountMinor: quote.targetAmountMinor,
        rate: quote.rate,
        effectiveRate: quote.effectiveRate,
        base: quote.base,
        rateSource: quote.rateSource,
        rateTimestamp: quote.rateTimestamp,
        spreadBps: quote.spreadBps,
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
      }),
    );

    if (!stored) {
      throw new PaymentRequestError(
        "QUOTE_PERSIST_FAILED",
        "Unable to save the quote",
        503,
      );
    }

    return {
      native,
      quote,
      sourceAmount: native.totalAmount,
      targetAmount: fromMinorUnits(quote.targetAmountMinor, targetCurrency),
    };
  } catch (error) {
    throw asPaymentError(error);
  }
}

export interface StoredCheckoutQuote {
  id: string;
  uid: string;
  status: string;
  requestKey: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  sourceAmountMinor: number;
  targetAmountMinor: number;
  rate: number;
  spreadBps: number;
  rateSource: string;
  rateTimestamp: string;
  expiresAt: string;
}

function parseStoredQuote(id: string, raw: Record<string, unknown>): StoredCheckoutQuote {
  const fromCurrency = raw.fromCurrency;
  const toCurrency = raw.toCurrency;
  if (!isCurrencyCode(fromCurrency) || !isCurrencyCode(toCurrency)) {
    throw new PaymentRequestError("INVALID_QUOTE", "Quote currencies are invalid");
  }

  const sourceAmountMinor = Number(raw.sourceAmountMinor);
  const targetAmountMinor = Number(raw.targetAmountMinor);
  if (
    !Number.isSafeInteger(sourceAmountMinor) ||
    !Number.isSafeInteger(targetAmountMinor) ||
    sourceAmountMinor <= 0 ||
    targetAmountMinor <= 0
  ) {
    throw new PaymentRequestError("INVALID_QUOTE", "Quote amounts are invalid");
  }

  return {
    id,
    uid: String(raw.uid || ""),
    status: String(raw.status || ""),
    requestKey: String(raw.requestKey || ""),
    fromCurrency,
    toCurrency,
    sourceAmountMinor,
    targetAmountMinor,
    rate: Number(raw.rate),
    spreadBps: Number(raw.spreadBps),
    rateSource: String(raw.rateSource || ""),
    rateTimestamp: String(raw.rateTimestamp || ""),
    expiresAt: String(raw.expiresAt || ""),
  };
}

export async function loadCheckoutQuote(
  repo: PaymentRepository,
  quoteId: unknown,
  uid: string,
  body: InitRequest,
  now: Date = new Date(),
): Promise<ResolvedPaymentQuote | null> {
  const id = str(quoteId);
  if (!id) return null;

  const raw = await repo.get(`fxQuotes/${id}`);
  if (!raw) {
    throw new PaymentRequestError("QUOTE_NOT_FOUND", "This quote no longer exists");
  }

  const stored = parseStoredQuote(id, raw);

  if (stored.uid !== uid) {
    throw new PaymentRequestError("QUOTE_OWNER_MISMATCH", "This quote belongs to another account");
  }
  if (stored.status !== "active" && stored.status !== "consumed") {
    throw new PaymentRequestError("QUOTE_ALREADY_USED", "This quote can no longer be used");
  }
  if (stored.requestKey !== quoteRequestKey(body)) {
    throw new PaymentRequestError(
      "QUOTE_MISMATCH",
      "The quote does not match this payment",
    );
  }

  const quote: ResolvedPaymentQuote = {
    id: stored.id,
    purpose: "checkout",
    fromCurrency: stored.fromCurrency,
    toCurrency: stored.toCurrency,
    sourceAmountMinor: stored.sourceAmountMinor,
    targetAmountMinor: stored.targetAmountMinor,
    rate: stored.rate,
    spreadBps: stored.spreadBps,
    rateSource: stored.rateSource,
    rateTimestamp: stored.rateTimestamp,
    expiresAt: stored.expiresAt,
  };

  if (!isQuoteUsable(quote as unknown as FxQuote, now)) {
    throw new PaymentRequestError("QUOTE_EXPIRED", "This quote has expired");
  }

  return quote;
}

export async function consumeCheckoutQuote(
  env: Env,
  quoteId: string,
  paymentRef: string,
): Promise<void> {
  const result = await firestoreUpdateFields(env, `fxQuotes/${quoteId}`, {
    status: { stringValue: "consumed" },
    consumedBy: { stringValue: paymentRef },
    consumedAt: { timestampValue: new Date().toISOString() },
  });

  if (!result.ok) {
    console.error("[fx-quote] could not mark quote consumed", {
      quoteId,
      paymentRef,
      status: result.status,
      error: result.error,
    });
  }
}
