import type { Env, InitRequest, TransactionType } from "../types";
import { calculateRevenue, calculateStoreRevenue } from "../revenue";
import {
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "../money/registry.generated";
import { hasCurrencyPrecision, toMinorUnits, fromMinorUnits } from "../money/amount";
import { isQuoteUsable, type FxQuote } from "../money/fx";

/**
 * Server-authoritative payment derivation (AGA-PAY-002 / A1).
 *
 * The request may only supply identifiers plus non-authoritative metadata.
 * Amounts, currency, creator UID, fees, referral relationship and product
 * price are always loaded from Firestore. Any client-supplied monetary or
 * identity field is rejected before a provider call is made.
 */

export class PaymentRequestError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "PaymentRequestError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface PaymentRepository {
  get(path: string): Promise<Record<string, unknown> | null>;
  query(
    collection: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<Record<string, unknown>[]>;
}

export const FREE_AMOUNT_TYPES: readonly TransactionType[] = ["support", "gift"];

const TRANSACTION_TYPES: readonly TransactionType[] = [
  "support",
  "gift",
  "booking",
  "gathering",
  "store",
  "community",
];

/**
 * Fields a client is not allowed to send. They are either monetary values,
 * identity values, or server-owned state.
 */
export const FORBIDDEN_REQUEST_FIELDS = [
  "creatorUid",
  "supporterId",
  "buyerId",
  "initiatedBy",
  "productPrice",
  "platformFee",
  "creatorEarnings",
  "referralEarnings",
  "processorCost",
  "platformFeePayer",
  "includeReferral",
  "referralUid",
  "referralId",
  "status",
  "providerRef",
  "orderTrackingId",
  "pesapal_tracking_id",
] as const;

const DEFAULT_MIN_SUPPORT_MAJOR = 1;
const DEFAULT_MAX_SUPPORT_MAJOR: Record<number, number> = {
  0: 10_000_000,
  2: 100_000,
  3: 100_000,
};

export interface ResolvedPaymentQuote {
  id: string;
  purpose: "checkout" | "withdrawal";
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

export interface ResolvedStoreItem {
  productId: string;
  productName: string;
  productType: string;
  productPrice: number;
  quantity: number;
  selectedSize: string;
  platformFeePayer: "buyer" | "creator";
}

export interface ResolvedShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface ResolvedPayment {
  type: TransactionType;
  creatorHandle: string;
  creatorUid: string;
  currency: string;
  totalAmount: number;
  platformFee: number;
  creatorEarnings: number;
  referralEarnings: number;
  processorCost: number;
  includeReferral: boolean;
  referralUid: string;
  referralId: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  quantity?: number;
  selectedSize?: string;
  items?: ResolvedStoreItem[];
  shippingAddress?: ResolvedShippingAddress;
  orderId?: string;
  platformFeePayer?: string;
  couponId?: string;
  couponCode?: string;
  discount?: number;
  bookingId?: string;
  gatheringId?: string;
  communityTierId?: string;
  communityInterval?: string;
  communitySubscriptionId?: string;
  buyerName?: string;
  buyerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhoto?: string;
  fx?: ResolvedPaymentQuote;
}

export interface ResolvePaymentOptions {
  /** A locked checkout quote. Without it, cross-currency item charges are rejected. */
  quote?: ResolvedPaymentQuote | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveStoredPrice(
  record: Record<string, unknown>,
  currency: string,
  legacyPrimaryField: string,
): number {
  const prices = record.prices;
  if (prices && typeof prices === "object" && Object.keys(prices).length > 0) {
    const v = (prices as Record<string, unknown>)[currency];
    return v != null && v !== "" ? num(v) : 0;
  }
  // Legacy compatibility: primary field belongs to record.currency (or RWF-era records)
  const recordCurrency = str(record.currency).toUpperCase();
  if (recordCurrency && recordCurrency === currency) {
    const legacy = num(record[legacyPrimaryField]);
    if (legacy > 0) return legacy;
  }
  if (!recordCurrency && currency === "RWF") {
    const legacy = num(record[legacyPrimaryField]);
    if (legacy > 0) return legacy;
  }
  return 0;
}

function hasField(body: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function roundMoney(value: number, currency: string): number {
  if (!isCurrencyCode(currency)) {
    throw new PaymentRequestError(
      "UNSUPPORTED_CURRENCY",
      `Unsupported currency: ${currency}`,
    );
  }
  const factor = 10 ** getCurrencyDefinition(currency).minorUnit;
  return Math.round(value * factor) / factor;
}

/**
 * Currencies that had no explicit Firestore policy before the registry existed
 * remain enabled. Every other code needs a `currencies/{code}` document so a
 * catalog entry alone can never start accepting money.
 */
const LEGACY_ENABLED_CURRENCIES: readonly CurrencyCode[] = ["RWF", "USD"];

function normalizeCurrency(raw: unknown, fallback: unknown): CurrencyCode {
  const value = (str(raw) || str(fallback)).toUpperCase();
  if (!value) {
    throw new PaymentRequestError(
      "MISSING_CURRENCY",
      "A currency is required; it is never assumed to be RWF",
    );
  }
  if (!isCurrencyCode(value)) {
    throw new PaymentRequestError(
      "UNSUPPORTED_CURRENCY",
      `Unsupported currency: ${value}`,
    );
  }
  return value;
}

async function resolveCurrency(
  repo: PaymentRepository,
  raw: unknown,
  fallback: unknown,
): Promise<CurrencyCode> {
  const currency = normalizeCurrency(raw, fallback);
  const docs = await repo.query("currencies", "code", currency, 1);
  const policy = docs[0];

  if (policy?.enabled === false) {
    throw new PaymentRequestError(
      "CURRENCY_DISABLED",
      `${currency} payments are currently disabled`,
    );
  }

  if (!policy && !LEGACY_ENABLED_CURRENCIES.includes(currency)) {
    throw new PaymentRequestError(
      "CURRENCY_NOT_CONFIGURED",
      `${currency} is not configured for payments`,
    );
  }

  return currency;
}

const LEGACY_CURRENCY_CUTOFF_MS = Date.parse("2026-12-01T00:00:00.000Z");

function isLegacyPreMultiCurrencyRecord(record: Record<string, unknown>): boolean {
  const rawDate = str(record.createdAt) || str(record.updatedAt);
  if (!rawDate) return true;
  const ms = Date.parse(rawDate);
  return !Number.isFinite(ms) || ms < LEGACY_CURRENCY_CUTOFF_MS;
}

async function resolveRecordCurrency(
  repo: PaymentRepository,
  record: Record<string, unknown>,
  creatorCurrency: unknown,
  requestedCurrency?: unknown,
): Promise<CurrencyCode> {
  const explicit = str(record.currency).toUpperCase();
  if (explicit) {
    return resolveCurrency(repo, explicit, creatorCurrency);
  }

  const prices = record.prices;
  if (prices && typeof prices === "object" && !Array.isArray(prices)) {
    const validCodes = Object.entries(prices as Record<string, unknown>)
      .filter(([code, v]) => isCurrencyCode(code.toUpperCase()) && v != null && v !== "" && num(v) > 0)
      .map(([code]) => code.toUpperCase() as CurrencyCode);

    if (validCodes.length > 0) {
      const req = str(requestedCurrency).toUpperCase();
      if (req && isCurrencyCode(req) && validCodes.includes(req)) {
        return resolveCurrency(repo, req, creatorCurrency);
      }
      const fallback = str(creatorCurrency).toUpperCase();
      if (fallback && isCurrencyCode(fallback) && validCodes.includes(fallback)) {
        return resolveCurrency(repo, fallback, creatorCurrency);
      }
      if (validCodes.includes("RWF")) {
        return resolveCurrency(repo, "RWF", creatorCurrency);
      }
      return resolveCurrency(repo, validCodes[0], creatorCurrency);
    }
  }

  if (isLegacyPreMultiCurrencyRecord(record)) {
    return resolveCurrency(repo, "RWF", creatorCurrency);
  }

  return resolveCurrency(repo, undefined, creatorCurrency);
}

function assertRequestedCurrency(raw: unknown, storedCurrency: string): void {
  const requested = str(raw).toUpperCase();
  if (requested && requested !== storedCurrency) {
    throw new PaymentRequestError(
      "CURRENCY_MISMATCH",
      `This item is priced in ${storedCurrency}`,
    );
  }
}

function parsePositiveAmount(raw: unknown, currency: string, field: string): number {
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentRequestError(
      "INVALID_AMOUNT",
      `${field} must be a positive number`,
    );
  }
  if (!hasCurrencyPrecision(amount, currency)) {
    const currencyCode = currency as CurrencyCode;
    const places = getCurrencyDefinition(currencyCode).minorUnit;
    throw new PaymentRequestError(
      "INVALID_AMOUNT",
      places === 0
        ? `${field} must be a whole number of ${currency}`
        : `${field} supports at most ${places} decimal places`,
    );
  }
  return roundMoney(amount, currency);
}

function parseQuantity(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 1;
  const quantity = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new PaymentRequestError(
      "INVALID_QUANTITY",
      "Quantity must be a positive whole number",
    );
  }
  return quantity;
}

export function resolveCreatorHandle(body: Record<string, unknown>): string {
  const handle = str(body.creatorHandle) || str(body.creatorId);
  if (!handle) {
    throw new PaymentRequestError(
      "MISSING_CREATOR",
      "creatorHandle is required",
    );
  }
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(handle)) {
    throw new PaymentRequestError(
      "INVALID_CREATOR",
      "creatorHandle is not a valid creator handle",
    );
  }
  return handle;
}

export function resolveRequestedType(
  body: Record<string, unknown>,
): TransactionType {
  const explicit = str(body.type) as TransactionType;
  const hasItems = Array.isArray(body.items) && body.items.length > 0;
  const inferred: TransactionType = body.communityTierId
    ? "community"
    : body.gatheringId
      ? "gathering"
      : body.bookingId
        ? "booking"
        : body.productId || hasItems
          ? "store"
          : "support";

  if (explicit && !TRANSACTION_TYPES.includes(explicit)) {
    throw new PaymentRequestError(
      "UNSUPPORTED_TYPE",
      `Unsupported payment type: ${explicit}`,
    );
  }

  if (explicit && explicit !== inferred) {
    const giftSupportAlias = explicit === "gift" && inferred === "support";
    if (!giftSupportAlias) {
      throw new PaymentRequestError(
        "TYPE_MISMATCH",
        `Payment type ${explicit} does not match the supplied identifiers`,
      );
    }
  }

  return explicit || inferred;
}

export function assertNoTrustedFields(
  body: Record<string, unknown>,
  type: TransactionType,
): void {
  for (const field of FORBIDDEN_REQUEST_FIELDS) {
    if (hasField(body, field)) {
      throw new PaymentRequestError(
        "TRUSTED_FIELD_REJECTED",
        `Field "${field}" is server-owned and must not be sent by the client`,
      );
    }
  }

  if (hasField(body, "amount") && !FREE_AMOUNT_TYPES.includes(type)) {
    throw new PaymentRequestError(
      "TRUSTED_FIELD_REJECTED",
      `Field "amount" is server-owned for ${type} payments`,
    );
  }
}

async function getMinSupportAmount(
  repo: PaymentRepository,
  currency: string,
): Promise<number> {
  const docs = await repo.query("currencies", "code", currency, 1);
  const configured = num(docs[0]?.minSupportAmount);
  return configured > 0 ? configured : DEFAULT_MIN_SUPPORT_MAJOR;
}

function getMaxSupportAmount(env: Env, currency: string): number {
  const code = currency as CurrencyCode;
  const configured = num(
    (env as unknown as Record<string, unknown>)[`MAX_SUPPORT_AMOUNT_${currency}`],
  );
  if (configured > 0) return configured;
  return DEFAULT_MAX_SUPPORT_MAJOR[getCurrencyDefinition(code).minorUnit] ?? 100_000;
}

async function resolveReferral(
  repo: PaymentRepository,
  creatorUid: string,
  creatorHandle: string,
): Promise<{ includeReferral: boolean; referralUid: string; referralId: string }> {
  const profile = await repo.get(`profiles/${creatorUid}`);
  const referralHandle = str(profile?.referralCreator);
  if (!referralHandle || referralHandle === creatorHandle) {
    return { includeReferral: false, referralUid: "", referralId: "" };
  }

  const referrer = await repo.get(`creators/${referralHandle}`);
  const referralUid = str(referrer?.uid);
  if (!referralUid || referralUid === creatorUid) {
    return { includeReferral: false, referralUid: "", referralId: "" };
  }

  return {
    includeReferral: true,
    referralUid,
    referralId: referralHandle,
  };
}

const PRE_MULTI_CURRENCY_CUTOFF_MS = Date.parse("2026-12-01T00:00:00.000Z");

async function resolveCouponDiscount(
  repo: PaymentRepository,
  rawCode: unknown,
  creatorHandle: string,
  creatorUid: string,
  productTotal: number,
  currency: CurrencyCode,
): Promise<{ discount: number; couponId?: string }> {
  const code = str(rawCode).toUpperCase();
  if (!code) return { discount: 0 };

  const coupons = await repo.query("storeCoupons", "code", code, 20);
  const coupon = coupons.find((c) => {
    const owner = str(c.creatorId);
    return (
      c.active !== false &&
      (owner === creatorHandle || owner === creatorUid)
    );
  });

  if (!coupon) {
    throw new PaymentRequestError(
      "INVALID_COUPON",
      "This coupon is not valid for this creator",
    );
  }

  const explicitCouponCurrency = str(coupon.currency).toUpperCase();
  const minPurchase = num(coupon.minPurchase);
  const isPercentage = str(coupon.discountType) === "percentage";
  let requiredCurrency = explicitCouponCurrency;
  if (!requiredCurrency && (!isPercentage || minPurchase > 0)) {
    const rawCreatedAt = str(coupon.createdAt);
    const createdMs = rawCreatedAt ? Date.parse(rawCreatedAt) : NaN;
    if (!rawCreatedAt || !Number.isFinite(createdMs) || createdMs < PRE_MULTI_CURRENCY_CUTOFF_MS) {
      requiredCurrency = "RWF";
    }
  }
  if (requiredCurrency && requiredCurrency !== currency) {
    throw new PaymentRequestError(
      "COUPON_CURRENCY_MISMATCH",
      `This coupon is only valid for ${requiredCurrency} purchases`,
    );
  }

  if (minPurchase > 0 && productTotal < minPurchase) {
    throw new PaymentRequestError(
      "COUPON_MIN_PURCHASE",
      `This coupon requires a minimum purchase of ${minPurchase} ${currency}`,
    );
  }

  const maxUses = num(coupon.maxUses);
  if (maxUses > 0 && num(coupon.usedCount) >= maxUses) {
    throw new PaymentRequestError(
      "COUPON_EXHAUSTED",
      "This coupon has reached its usage limit",
    );
  }

  const rawDiscount =
    isPercentage
      ? (productTotal * num(coupon.discountValue)) / 100
      : num(coupon.discountValue);

  const discount = Math.min(productTotal, Math.max(0, rawDiscount));
  const couponId = str(coupon._id) || str(coupon.id) || undefined;
  return { discount, ...(discount > 0 && couponId ? { couponId } : {}) };
}

function withRevenue(
  base: Omit<
    ResolvedPayment,
    | "platformFee"
    | "creatorEarnings"
    | "referralEarnings"
    | "processorCost"
  >,
  env: Env,
): ResolvedPayment {
  const revenue = calculateRevenue(
    base.totalAmount,
    base.includeReferral,
    env,
  );
  return {
    ...base,
    platformFee: roundMoney(revenue.platformShare, base.currency),
    creatorEarnings: roundMoney(revenue.creatorShare, base.currency),
    referralEarnings: base.includeReferral
      ? roundMoney(revenue.referralShare, base.currency)
      : 0,
    processorCost: roundMoney(
      base.totalAmount * (num(env.PROCESSOR_FEE_PERCENT) / 100),
      base.currency,
    ),
  };
}


function allocateMinor(totalMinor: number, weights: readonly number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    throw new PaymentRequestError(
      "INVALID_QUOTE",
      "Quoted payment has no revenue shares",
    );
  }

  const totalBig = BigInt(totalMinor);
  const sumBig = BigInt(weightSum);
  const shares = weights.map((weight) => (totalBig * BigInt(weight)) / sumBig);
  const remainders = weights.map((weight) => (totalBig * BigInt(weight)) % sumBig);
  const unallocated = totalBig - shares.reduce((sum, share) => sum + share, BigInt(0));
  const order = weights
    .map((_, index) => index)
    .sort((left, right) => {
      const difference = remainders[right] - remainders[left];
      if (difference > BigInt(0)) return 1;
      if (difference < BigInt(0)) return -1;
      return left - right;
    });

  for (let index = 0; index < Number(unallocated); index += 1) {
    shares[order[index]] += BigInt(1);
  }

  return shares.map((share) => Number(share));
}

function quoteMetadata(quote: ResolvedPaymentQuote): ResolvedPaymentQuote {
  return {
    id: quote.id,
    purpose: quote.purpose,
    fromCurrency: quote.fromCurrency,
    toCurrency: quote.toCurrency,
    sourceAmountMinor: quote.sourceAmountMinor,
    targetAmountMinor: quote.targetAmountMinor,
    rate: quote.rate,
    spreadBps: quote.spreadBps,
    rateSource: quote.rateSource,
    rateTimestamp: quote.rateTimestamp,
    expiresAt: quote.expiresAt,
  };
}

/**
 * Apply a locked checkout quote to a native-currency payment. Fees are
 * reallocated in integer minor units of the charge currency so the parts sum
 * exactly to the quoted total.
 */
function applyCheckoutQuote(
  resolved: ResolvedPayment,
  quote: ResolvedPaymentQuote,
  requestedCurrency: unknown,
  env: Env,
): ResolvedPayment {
  if (quote.purpose !== "checkout") {
    throw new PaymentRequestError("INVALID_QUOTE", "Quote is not a checkout quote");
  }
  if (!isQuoteUsable(quote as unknown as FxQuote)) {
    throw new PaymentRequestError("QUOTE_EXPIRED", "This quote has expired");
  }
  if (quote.fromCurrency !== resolved.currency) {
    throw new PaymentRequestError(
      "QUOTE_MISMATCH",
      `Quote is for ${quote.fromCurrency}, but this item is priced in ${resolved.currency}`,
    );
  }
  const requested = str(requestedCurrency).toUpperCase();
  if (requested && requested !== quote.toCurrency) {
    throw new PaymentRequestError(
      "QUOTE_MISMATCH",
      `Quote charges ${quote.toCurrency}, not ${requested}`,
    );
  }

  try {
    const sourceMinor = toMinorUnits(resolved.totalAmount, resolved.currency);
    if (sourceMinor !== quote.sourceAmountMinor) {
      throw new PaymentRequestError(
        "QUOTE_MISMATCH",
        "The item amount changed after the quote was created",
      );
    }
  } catch (error) {
    if (error instanceof PaymentRequestError) throw error;
    throw new PaymentRequestError("INVALID_QUOTE", "Quote amount is invalid");
  }

  const weights = [
    toMinorUnits(resolved.platformFee, resolved.currency),
    toMinorUnits(resolved.creatorEarnings, resolved.currency),
    quote.fromCurrency === quote.toCurrency
      ? 0
      : toMinorUnits(resolved.referralEarnings, resolved.currency),
  ];
  const [platformMinor, creatorMinor, referralMinor] = allocateMinor(
    quote.targetAmountMinor,
    weights,
  );
  const targetCurrency = quote.toCurrency;
  const totalAmount = fromMinorUnits(quote.targetAmountMinor, targetCurrency);

  return {
    ...resolved,
    currency: targetCurrency,
    totalAmount,
    platformFee: fromMinorUnits(platformMinor, targetCurrency),
    creatorEarnings: fromMinorUnits(creatorMinor, targetCurrency),
    referralEarnings: fromMinorUnits(referralMinor, targetCurrency),
    processorCost: roundMoney(
      totalAmount * (num(env.PROCESSOR_FEE_PERCENT) / 100),
      targetCurrency,
    ),
    fx: quoteMetadata(quote),
  };
}

function finalizePayment(
  resolved: ResolvedPayment,
  quote: ResolvedPaymentQuote | null | undefined,
  requestedCurrency: unknown,
  env: Env,
): ResolvedPayment {
  if (!quote) return resolved;
  return applyCheckoutQuote(resolved, quote, requestedCurrency, env);
}

export async function resolvePayment(
  env: Env,
  body: InitRequest,
  uid: string,
  repo: PaymentRepository,
  options: ResolvePaymentOptions = {},
): Promise<ResolvedPayment> {
  const quote = options.quote ?? null;
  const raw = body as unknown as Record<string, unknown>;
  const type = resolveRequestedType(raw);
  assertNoTrustedFields(raw, type);

  const creatorHandle = resolveCreatorHandle(raw);
  const creator = await repo.get(`creators/${creatorHandle}`);
  if (!creator) {
    throw new PaymentRequestError(
      "UNKNOWN_CREATOR",
      "Creator not found",
      404,
    );
  }
  const creatorUid = str(creator.uid);
  if (!creatorUid) {
    throw new PaymentRequestError(
      "UNKNOWN_CREATOR",
      "Creator record is missing its owner",
      404,
    );
  }

  const referral = await resolveReferral(repo, creatorUid, creatorHandle);

  if (FREE_AMOUNT_TYPES.includes(type)) {
    if (quote) {
      throw new PaymentRequestError(
        "QUOTE_NOT_APPLICABLE",
        "Free-amount support is charged directly in the supporter's currency",
      );
    }
    const currency = await resolveCurrency(repo, body.currency, creator.currency);
    const amount = parsePositiveAmount(body.amount, currency, "amount");
    const min = await getMinSupportAmount(repo, currency);
    const max = getMaxSupportAmount(env, currency);
    if (amount < min) {
      throw new PaymentRequestError(
        "AMOUNT_OUT_OF_RANGE",
        `Minimum support amount is ${min} ${currency}`,
      );
    }
    if (amount > max) {
      throw new PaymentRequestError(
        "AMOUNT_OUT_OF_RANGE",
        `Maximum support amount is ${max} ${currency}`,
      );
    }

    return withRevenue(
      {
        type,
        creatorHandle,
        creatorUid,
        currency,
        totalAmount: amount,
        ...referral,
      },
      env,
    );
  }

  if (type === "store") {
    const rawItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : str(body.productId)
        ? [
            {
              productId: str(body.productId),
              quantity: body.quantity,
              selectedSize: str(body.selectedSize),
            },
          ]
        : [];

    if (rawItems.length === 0) {
      throw new PaymentRequestError(
        "MISSING_PRODUCT",
        "At least one product is required for store payments",
      );
    }

    if (rawItems.length > 50) {
      throw new PaymentRequestError(
        "TOO_MANY_ITEMS",
        "A single store order supports at most 50 line items",
      );
    }

    const parsedItems = rawItems.map((entry) => {
      const record = entry && typeof entry === "object"
        ? (entry as unknown as Record<string, unknown>)
        : {};
      const itemProductId = str(record.productId);
      if (!itemProductId) {
        throw new PaymentRequestError(
          "MISSING_PRODUCT",
          "Each item must include a valid productId",
        );
      }
      return {
        productId: itemProductId,
        quantity: parseQuantity(record.quantity),
        selectedSize: str(record.selectedSize),
      };
    });

    const uniqueProductIds = Array.from(new Set(parsedItems.map((i) => i.productId)));
    const productCache = new Map<string, Record<string, unknown>>();
    await Promise.all(
      uniqueProductIds.map(async (id) => {
        const doc = await repo.get(`storeProducts/${id}`);
        if (!doc) {
          throw new PaymentRequestError(
            "PRODUCT_NOT_FOUND",
            "Product not found",
            404,
          );
        }
        if (doc.active === false) {
          throw new PaymentRequestError(
            "PRODUCT_UNAVAILABLE",
            `${str(doc.name) || "This product"} is not available`,
          );
        }
        const productOwner =
          str(doc.creatorUid) || str(doc.creatorId) || str(doc.creatorHandle);
        if (productOwner !== creatorUid && productOwner !== creatorHandle) {
          throw new PaymentRequestError(
            "PRODUCT_CREATOR_MISMATCH",
            "This product does not belong to the requested creator",
          );
        }
        productCache.set(id, doc);
      }),
    );

    const qtyByProduct = new Map<string, number>();
    for (const item of parsedItems) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
    }

    let cartCurrency: CurrencyCode | null = null;
    for (const [id, totalProductQty] of qtyByProduct.entries()) {
      const product = productCache.get(id)!;
      const itemCurrency = await resolveRecordCurrency(
        repo,
        product,
        creator.currency,
        quote ? undefined : body.currency,
      );
      if (!cartCurrency) {
        cartCurrency = itemCurrency;
      } else if (cartCurrency !== itemCurrency) {
        throw new PaymentRequestError(
          "MIXED_CURRENCIES",
          `All items in an order must share the same currency (${cartCurrency} and ${itemCurrency} cannot be combined)`,
        );
      }
      if (
        product.type === "physical" &&
        product.stock !== undefined &&
        product.stock !== null &&
        totalProductQty > num(product.stock)
      ) {
        throw new PaymentRequestError(
          "INSUFFICIENT_STOCK",
          `Requested quantity for ${str(product.name) || "a product"} is not available`,
        );
      }
    }

    const currency = cartCurrency!;
    if (!quote) assertRequestedCurrency(body.currency, currency);

    const resolvedItems: ResolvedStoreItem[] = [];
    const lineSummaries: Array<{ lineSubtotal: number; feePayer: "buyer" | "creator" }> = [];
    let productsTotal = 0;
    let totalQuantity = 0;

    for (const item of parsedItems) {
      const product = productCache.get(item.productId)!;
      const baseUnitPrice = resolveStoredPrice(product, currency, "price");
      if (baseUnitPrice <= 0) {
        throw new PaymentRequestError(
          "INVALID_PRODUCT_PRICE",
          `${str(product.name) || "This product"} has no valid price`,
        );
      }

      let lineSubtotal = roundMoney(baseUnitPrice * item.quantity, currency);
      if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0) {
        const bestBulk = (product.bulkPricing as Array<Record<string, unknown>>)
          .filter(
            (b) =>
              num(b.minQuantity) > 0 &&
              item.quantity >= num(b.minQuantity) &&
              num(b.discountPercentage) > 0 &&
              num(b.discountPercentage) <= 100,
          )
          .sort((a, b) => num(b.discountPercentage) - num(a.discountPercentage))[0];
        if (bestBulk) {
          const bulkPct = num(bestBulk.discountPercentage);
          lineSubtotal = roundMoney(lineSubtotal - (lineSubtotal * bulkPct) / 100, currency);
        }
      }

      const effectiveUnitPrice = roundMoney(lineSubtotal / item.quantity, currency);
      const feePayer: "buyer" | "creator" =
        str(product.platformFeePayer) === "creator" ? "creator" : "buyer";

      productsTotal += lineSubtotal;
      totalQuantity += item.quantity;
      lineSummaries.push({ lineSubtotal, feePayer });

      resolvedItems.push({
        productId: item.productId,
        productName: str(product.name),
        productType: str(product.type) || "digital",
        productPrice: effectiveUnitPrice,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        platformFeePayer: feePayer,
      });
    }

    productsTotal = roundMoney(productsTotal, currency);
    const { discount: rawDiscount, couponId } = await resolveCouponDiscount(
      repo,
      body.couponCode,
      creatorHandle,
      creatorUid,
      productsTotal,
      currency,
    );

    const appliedDiscount = rawDiscount > 0 ? roundMoney(rawDiscount, currency) : 0;
    const discountedProductsTotal = roundMoney(
      Math.max(0, productsTotal - appliedDiscount),
      currency,
    );
    if (discountedProductsTotal <= 0) {
      throw new PaymentRequestError(
        "INVALID_AMOUNT",
        "The discounted total is not payable",
      );
    }

    const discountFactor = productsTotal > 0 ? discountedProductsTotal / productsTotal : 0;
    let totalPlatformFee = 0;
    let totalReferralEarnings = 0;
    let totalAmount = 0;

    for (const line of lineSummaries) {
      const discountedLine = roundMoney(line.lineSubtotal * discountFactor, currency);
      const itemRevenue = calculateStoreRevenue(
        discountedLine,
        line.feePayer,
        env,
        referral.includeReferral,
      );
      totalPlatformFee += roundMoney(itemRevenue.platformFee, currency);
      if (referral.includeReferral) {
        totalReferralEarnings += roundMoney(itemRevenue.referralEarnings, currency);
      }
      totalAmount += roundMoney(itemRevenue.totalAmount, currency);
    }

    totalPlatformFee = roundMoney(totalPlatformFee, currency);
    totalReferralEarnings = roundMoney(totalReferralEarnings, currency);
    totalAmount = roundMoney(totalAmount, currency);
    const totalCreatorEarnings = roundMoney(
      Math.max(0, totalAmount - totalPlatformFee - totalReferralEarnings),
      currency,
    );

    const orderId = str(body.orderId);
    if (orderId) {
      const existingOrder = await repo.get(`storeOrders/${orderId}`);
      if (!existingOrder) {
        throw new PaymentRequestError("ORDER_NOT_FOUND", "Store order not found", 404);
      }
      const existingBuyer = str(existingOrder.buyerId);
      if (existingBuyer && existingBuyer !== uid) {
        throw new PaymentRequestError(
          "ORDER_OWNER_MISMATCH",
          "This order belongs to a different account",
          403,
        );
      }
      const existingStatus = str(existingOrder.status).toLowerCase();
      if (["paid", "processing", "shipped", "delivered"].includes(existingStatus)) {
        throw new PaymentRequestError(
          "ORDER_ALREADY_PAID",
          "This order has already been paid",
        );
      }
    }

    const rawShipping =
      body.shippingAddress && typeof body.shippingAddress === "object"
        ? body.shippingAddress
        : null;
    const shippingAddress: ResolvedShippingAddress | undefined = rawShipping
      ? {
          fullName: str(rawShipping.fullName),
          phone: str(rawShipping.phone),
          address: str(rawShipping.address),
          city: str(rawShipping.city),
          country: str(rawShipping.country),
        }
      : undefined;

    const firstResolved = resolvedItems[0];
    const summaryProductName =
      resolvedItems.length === 1
        ? firstResolved.productName
        : `${firstResolved.productName} (+${resolvedItems.length - 1} more)`;
    const combinedFeePayer = resolvedItems.every((i) => i.platformFeePayer === "creator")
      ? "creator"
      : "buyer";

    return finalizePayment({
      type,
      creatorHandle,
      creatorUid,
      currency,
      totalAmount,
      platformFee: totalPlatformFee,
      creatorEarnings: totalCreatorEarnings,
      referralEarnings: totalReferralEarnings,
      processorCost: roundMoney(
        totalAmount * (num(env.PROCESSOR_FEE_PERCENT) / 100),
        currency,
      ),
      ...referral,
      productId: firstResolved.productId,
      productName: summaryProductName,
      productPrice: firstResolved.productPrice,
      quantity: totalQuantity,
      selectedSize: firstResolved.selectedSize,
      items: resolvedItems,
      ...(shippingAddress ? { shippingAddress } : {}),
      ...(orderId ? { orderId } : {}),
      platformFeePayer: combinedFeePayer,
      ...(couponId && appliedDiscount > 0 ? { couponId } : {}),
      couponCode: appliedDiscount > 0 ? str(body.couponCode).toUpperCase() : undefined,
      discount: appliedDiscount > 0 ? appliedDiscount : undefined,
      buyerName: str(body.buyerName) || shippingAddress?.fullName || "",
      buyerEmail: str(body.buyerEmail) || str(body.email),
    }, quote, body.currency, env);
  }

  if (type === "booking") {
    const bookingId = str(body.bookingId);
    if (!bookingId) {
      throw new PaymentRequestError(
        "MISSING_BOOKING",
        "bookingId is required for booking payments",
      );
    }
    const booking = await repo.get(`bookingRequests/${bookingId}`);
    if (!booking) {
      throw new PaymentRequestError(
        "BOOKING_NOT_FOUND",
        "Booking not found",
        404,
      );
    }

    const bookingHandle = str(booking.creatorHandle) || str(booking.creatorId);
    const bookingUid = str(booking.creatorUid);
    if (
      bookingHandle !== creatorHandle ||
      (bookingUid && bookingUid !== creatorUid)
    ) {
      throw new PaymentRequestError(
        "BOOKING_CREATOR_MISMATCH",
        "This booking does not belong to the requested creator",
      );
    }

    const bookingStatus = str(booking.status).toLowerCase();
    if (bookingStatus && !["pending", "accepted"].includes(bookingStatus)) {
      throw new PaymentRequestError(
        "BOOKING_NOT_PAYABLE",
        "This booking is not payable",
      );
    }
    if (str(booking.paymentStatus) === "paid") {
      throw new PaymentRequestError(
        "BOOKING_ALREADY_PAID",
        "This booking has already been paid",
      );
    }

    const currency = await resolveCurrency(repo, booking.currency, creator.currency);
    if (!quote) assertRequestedCurrency(body.currency, currency);
    const amount = parsePositiveAmount(
      booking.paymentAmount,
      currency,
      "booking.paymentAmount",
    );

    return finalizePayment(
      withRevenue(
        {
          type,
          creatorHandle,
          creatorUid,
          currency,
          totalAmount: amount,
          ...referral,
          bookingId,
          buyerName: str(body.buyerName) || str(booking.bookerName),
          buyerEmail:
            str(body.buyerEmail) || str(body.email) || str(booking.bookerEmail),
        },
        env,
      ),
      quote,
      body.currency,
      env,
    );
  }

  if (type === "gathering") {
    const gatheringId = str(body.gatheringId);
    if (!gatheringId) {
      throw new PaymentRequestError(
        "MISSING_GATHERING",
        "gatheringId is required for gathering payments",
      );
    }
    const gathering = await repo.get(`creatorGatherings/${gatheringId}`);
    if (!gathering) {
      throw new PaymentRequestError(
        "GATHERING_NOT_FOUND",
        "Gathering not found",
        404,
      );
    }
    if (str(gathering.creatorId) !== creatorUid) {
      throw new PaymentRequestError(
        "GATHERING_CREATOR_MISMATCH",
        "This gathering does not belong to the requested creator",
      );
    }
    const gatheringStatus = str(gathering.status).toLowerCase();
    if (
      gathering.active === false ||
      ["disabled", "cancelled", "canceled", "expired"].includes(gatheringStatus)
    ) {
      throw new PaymentRequestError(
        "GATHERING_NOT_PAYABLE",
        "This gathering is not accepting payments",
      );
    }

    const currency = await resolveRecordCurrency(
      repo,
      gathering,
      creator.currency,
      quote ? undefined : body.currency,
    );
    if (!quote) assertRequestedCurrency(body.currency, currency);
    const price = resolveStoredPrice(gathering, currency, "ticketPrice");
    if (price <= 0) {
      throw new PaymentRequestError(
        "GATHERING_NOT_PAYABLE",
        "This gathering does not require payment",
      );
    }

    return finalizePayment(
      withRevenue(
        {
          type,
          creatorHandle,
          creatorUid,
          currency,
          totalAmount: roundMoney(price, currency),
          ...referral,
          gatheringId,
          attendeeName: str(body.attendeeName),
          attendeeEmail: str(body.attendeeEmail) || str(body.email),
          attendeePhoto: str(body.attendeePhoto),
        },
        env,
      ),
      quote,
      body.currency,
      env,
    );
  }

  // community
  const tierId = str(body.communityTierId);
  if (!tierId) {
    throw new PaymentRequestError(
      "MISSING_COMMUNITY_TIER",
      "communityTierId is required for community payments",
    );
  }
  const tiers = Array.isArray(creator.communityTiers)
    ? (creator.communityTiers as Array<Record<string, unknown>>)
    : [];
  const tier = tiers.find((t) => str(t.id) === tierId);
  if (!tier || tier.isActive === false) {
    throw new PaymentRequestError(
      "COMMUNITY_TIER_NOT_FOUND",
      "Community tier not found",
      404,
    );
  }

  const currency = await resolveRecordCurrency(
    repo,
    tier,
    creator.currency,
    quote ? undefined : body.currency,
  );
  if (!quote) assertRequestedCurrency(body.currency, currency);
  const price = resolveStoredPrice(tier, currency, "price");
  if (price <= 0) {
    throw new PaymentRequestError(
      "INVALID_AMOUNT",
      "This community tier has no valid price",
    );
  }

  const interval = str(body.communityInterval) || str(tier.interval) || "monthly";
  if (!["monthly", "yearly"].includes(interval)) {
    throw new PaymentRequestError(
      "INVALID_INTERVAL",
      "Community interval must be monthly or yearly",
    );
  }

  const subscriptionId = str(body.communitySubscriptionId);
  if (!subscriptionId) {
    throw new PaymentRequestError(
      "MISSING_SUBSCRIPTION",
      "communitySubscriptionId is required for community payments",
    );
  }
  const subscription = await repo.get(
    `communitySubscriptions/${subscriptionId}`,
  );
  if (!subscription) {
    throw new PaymentRequestError(
      "COMMUNITY_SUBSCRIPTION_NOT_FOUND",
      "Community subscription not found",
      404,
    );
  }
  if (
    str(subscription.userId) !== uid ||
    str(subscription.tierId) !== tierId ||
    str(subscription.creatorHandle) !== creatorHandle
  ) {
    throw new PaymentRequestError(
      "COMMUNITY_SUBSCRIPTION_MISMATCH",
      "This subscription does not match the payment request",
    );
  }

  return finalizePayment(
    withRevenue(
      {
        type,
        creatorHandle,
        creatorUid,
        currency,
        totalAmount: roundMoney(price, currency),
        ...referral,
        communityTierId: tierId,
        communityInterval: interval,
        communitySubscriptionId: subscriptionId,
        buyerEmail: str(body.buyerEmail) || str(body.email),
      },
      env,
    ),
    quote,
    body.currency,
    env,
  );
}
