import type { Env, InitRequest, TransactionType } from "../types";
import { calculateRevenue, calculateStoreRevenue } from "../revenue";

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

const DEFAULT_MIN_SUPPORT: Record<string, number> = { RWF: 100, USD: 1 };
const DEFAULT_MAX_SUPPORT: Record<string, number> = {
  RWF: 10_000_000,
  USD: 10_000,
};

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
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasField(body: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function roundMoney(value: number, currency: string): number {
  if (currency === "RWF") return Math.round(value);
  return Math.round(value * 100) / 100;
}

function normalizeCurrency(raw: unknown, fallback: unknown): string {
  const currency = (str(raw) || str(fallback) || "RWF").toUpperCase();
  if (currency !== "RWF" && currency !== "USD") {
    throw new PaymentRequestError(
      "UNSUPPORTED_CURRENCY",
      `Unsupported currency: ${currency}`,
    );
  }
  return currency;
}

function parsePositiveAmount(raw: unknown, currency: string, field: string): number {
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentRequestError(
      "INVALID_AMOUNT",
      `${field} must be a positive number`,
    );
  }
  if (currency === "RWF" && !Number.isInteger(amount)) {
    throw new PaymentRequestError(
      "INVALID_AMOUNT",
      `${field} must be a whole number of RWF`,
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
  return configured > 0 ? configured : DEFAULT_MIN_SUPPORT[currency];
}

function getMaxSupportAmount(env: Env, currency: string): number {
  const configured =
    currency === "USD"
      ? num(env.MAX_SUPPORT_AMOUNT_USD)
      : num(env.MAX_SUPPORT_AMOUNT_RWF);
  return configured > 0 ? configured : DEFAULT_MAX_SUPPORT[currency];
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

export async function resolvePayment(
  env: Env,
  body: InitRequest,
  uid: string,
  repo: PaymentRepository,
): Promise<ResolvedPayment> {
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
    const currency = normalizeCurrency(body.currency, creator.currency);
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

    const currency = normalizeCurrency(body.currency, product.currency);
    const price =
      currency === "USD"
        ? num(product.priceUSD ?? product.price)
        : num(product.price);
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

    return {
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
    };
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

    const currency = normalizeCurrency(booking.currency, creator.currency);
    const amount = parsePositiveAmount(
      booking.paymentAmount,
      currency,
      "booking.paymentAmount",
    );

    return withRevenue(
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

    const currency = normalizeCurrency(body.currency, gathering.currency);
    const price =
      currency === "USD"
        ? num(gathering.priceUSD ?? gathering.ticketPrice)
        : num(gathering.ticketPrice);
    if (price <= 0) {
      throw new PaymentRequestError(
        "GATHERING_NOT_PAYABLE",
        "This gathering does not require payment",
      );
    }

    return withRevenue(
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

  const currency = normalizeCurrency(body.currency, tier.currency);
  const price =
    currency === "USD" ? num(tier.priceUSD ?? tier.price) : num(tier.price);
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

  return withRevenue(
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
  );
}
