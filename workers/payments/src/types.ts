export type PaymentMethod = "momo" | "card";
export type TransactionType = "support" | "booking" | "gathering" | "store" | "community";

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
}

export interface MomoInitRequest {
  amount: number;
  phone?: string;
  creatorId: string;
  creatorUid: string;
  supporterId?: string;
  message?: string;
  includeReferral?: boolean;
  referralUid?: string;
  referralId?: string;
  productId?: string;
  productPrice?: number;
  productName?: string;
  quantity?: number;
  selectedSize?: string;
  platformFeePayer?: string;
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
  currency?: string;
}

export interface CardInitRequest extends MomoInitRequest {
  firstName?: string;
  lastName?: string;
  buyerId?: string;
}

export interface PaypackWebhookPayload {
  data: {
    ref: string;
    status: string;
    client: string;
    amount: string;
    number: string;
  };
}

export interface PesapalIPNPayload {
  OrderTrackingId: string;
  OrderMerchantReference: string;
  OrderNotificationType: string;
}
