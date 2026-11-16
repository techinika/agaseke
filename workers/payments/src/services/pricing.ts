import type { Env, InitRequest, TransactionType } from "../types";
import { calculateRevenue, calculateStoreRevenue } from "../revenue";
import {
  getCurrencyDefinition,
  isCurrencyCode,
  type CurrencyCode,
} from "../money/registry.generated";
import { hasCurrencyPrecision, toMinorUnits, fromMinorUnits } from "../money/amount";
import { assertMethodSupportsCurrency } from "../money/rails";
import { FxError, isQuoteUsable, type FxQuote } from "../money/fx";

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
  platformFeePayer?: string;
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
  if (prices && typeof prices === "object") {
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
  const inferred: TransactionType = body.communityTierId
    ? "community"
    : body.gatheringId
      ? "gathering"
      : body.bookingId
        ? "booking"
        : body.productId
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

async function resolveCouponDiscount(
  repo: PaymentRepository,
  rawCode: unknown,
  creatorHandle: string,
  creatorUid: string,
  productTotal: number,
): Promise<number> {
  const code = str(rawCode).toUpperCase();
  if (!code) return 0;

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

  const minPurchase = num(coupon.minPurchase);
  if (minPurchase > 0 && productTotal < minPurchase) {
    throw new PaymentRequestError(
      "COUPON_MIN_PURCHASE",
      `This coupon requires a minimum purchase of ${minPurchase}`,
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
    str(coupon.discountType) === "percentage"
      ? (productTotal * num(coupon.discountValue)) / 100
      : num(coupon.discountValue);

  return Math.min(productTotal, Math.max(0, rawDiscount));
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
    const productId = str(body.productId);
    if (!productId) {
      throw new PaymentRequestError(
        "MISSING_PRODUCT",
        "productId is required for store payments",
      );
    }
    const product = await repo.get(`storeProducts/${productId}`);
    if (!product) {
      throw new PaymentRequestError(
        "PRODUCT_NOT_FOUND",
        "Product not found",
        404,
      );
    }
    if (product.active === false) {
      throw new PaymentRequestError(
        "PRODUCT_UNAVAILABLE",
        "This product is not available",
      );
    }

    const productOwner =
      str(product.creatorUid) || str(product.creatorId) || str(product.creatorHandle);
    if (productOwner !== creatorUid && productOwner !== creatorHandle) {
      throw new PaymentRequestError(
        "PRODUCT_CREATOR_MISMATCH",
        "This product does not belong to the requested creator",
      );
    }

    const currency = await resolveCurrency(repo, product.currency, creator.currency);
    if (!quote) assertRequestedCurrency(body.currency, currency);
    const price = resolveStoredPrice(product, currency, "price");
    if (price <= 0) {
      throw new PaymentRequestError(
        "INVALID_PRODUCT_PRICE",
        "This product has no valid price",
      );
    }

    const quantity = parseQuantity(body.quantity);
    if (
      product.type === "physical" &&
      product.stock !== undefined &&
      product.stock !== null &&
      quantity > num(product.stock)
    ) {
      throw new PaymentRequestError(
        "INSUFFICIENT_STOCK",
        "The requested quantity is not available",
      );
    }

    const productTotal = roundMoney(price * quantity, currency);
    const feePayer =
      str(product.platformFeePayer) === "creator" ? "creator" : "buyer";
    const storeRevenue = calculateStoreRevenue(productTotal, feePayer, env);
    const discount = await resolveCouponDiscount(
      repo,
      body.couponCode,
      creatorHandle,
      creatorUid,
      productTotal,
    );

    const totalAmount = roundMoney(
      Math.max(0, storeRevenue.totalAmount - discount),
      currency,
    );
    if (totalAmount <= 0) {
      throw new PaymentRequestError(
        "INVALID_AMOUNT",
        "The discounted total is not payable",
      );
    }

    return finalizePayment({
      type,
      creatorHandle,
      creatorUid,
      currency,
      totalAmount,
      platformFee: roundMoney(storeRevenue.platformFee, currency),
      creatorEarnings: roundMoney(
        Math.max(0, storeRevenue.creatorEarnings - discount),
        currency,
      ),
      referralEarnings: referral.includeReferral
        ? roundMoney(storeRevenue.referralEarnings, currency)
        : 0,
      processorCost: roundMoney(
        totalAmount * (num(env.PROCESSOR_FEE_PERCENT) / 100),
        currency,
      ),
      ...referral,
      productId,
      productName: str(product.name),
      productPrice: price,
      quantity,
      selectedSize: str(body.selectedSize),
      platformFeePayer: feePayer,
      couponCode: discount > 0 ? str(body.couponCode).toUpperCase() : undefined,
      discount: discount > 0 ? roundMoney(discount, currency) : undefined,
      buyerName: str(body.buyerName),
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

    const currency = await resolveCurrency(repo, gathering.currency, creator.currency);
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

  const currency = await resolveCurrency(repo, tier.currency, creator.currency);
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
