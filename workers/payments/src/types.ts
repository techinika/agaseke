export type PaymentMethod = "momo" | "card";
export type TransactionType =
  | "support"
  | "gift"
  | "booking"
  | "gathering"
  | "store"
  | "community";

export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  PAYPACK_CLIENT_ID: string;
  PAYPACK_CLIENT_SECRET: string;
  PAYPACK_WEBHOOK_SECRET: string;
  PESAPAL_URL: string;
  PESAPAL_CONSUMER_KEY: string;
  PESAPAL_CONSUMER_SECRET: string;
  PESAPAL_IPN_ID: string;
  APP_URL: string;
  NEXT_PUBLIC_PLATFORM_SHARE: string;
  NEXT_PUBLIC_CREATOR_SHARE: string;
  NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL: string;
  NEXT_PUBLIC_REFERRAL_SHARE: string;
  PAYMENTS_WORKER_URL: string;
  COMMS_WORKER_URL: string;
  SUPPORT_WORKER_URL: string;
  STORE_WORKER_URL: string;
  BOOKINGS_WORKER_URL: string;
  COMMUNITY_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
  /** Percentage (0-100) of the total that the processor keeps. Default 0. */
  PROCESSOR_FEE_PERCENT?: string;
  MAX_SUPPORT_AMOUNT_RWF?: string;
  MAX_SUPPORT_AMOUNT_USD?: string;
}

/**
 * Initiation accepts identifiers and non-authoritative metadata only.
 * The server derives amount, currency, creator UID, fees and referral.
 * `creatorId` is a legacy alias for the creator handle and is validated by
 * loading the creator document; `creatorUid` is never accepted.
 */
export interface InitRequest {
  creatorHandle?: string;
  /** @deprecated Legacy alias for creatorHandle. Not trusted as an identity. */
  creatorId?: string;
  type?: TransactionType;
  /** Only accepted for free-amount types (support, gift). */
  amount?: number;
  currency?: string;
  phone?: string;
  message?: string;
  productId?: string;
  quantity?: number;
  selectedSize?: string;
  couponCode?: string;
  buyerName?: string;
  email?: string;
  buyerEmail?: string;
  bookingId?: string;
  gatheringId?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhoto?: string;
  communityTierId?: string;
  communityInterval?: string;
  communitySubscriptionId?: string;
  firstName?: string;
  lastName?: string;
  idempotencyKey?: string;
}

export type MomoInitRequest = InitRequest;
export type CardInitRequest = InitRequest;

export interface PaymentInitResult {
  ref: string;
  status: string;
  redirect_url?: string;
  merchant_reference?: string;
}

export interface PaypackWebhookPayload {
  data: {
    ref: string;
    status: string;
    client?: string;
    amount: string;
    currency?: string;
    number?: string;
  };
}

export interface PesapalIPNPayload {
  OrderTrackingId: string;
  OrderMerchantReference: string;
  OrderNotificationType: string;
}
