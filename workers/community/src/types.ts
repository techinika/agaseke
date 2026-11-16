export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SUPPORT_WORKER_URL: string;
  COMMUNITY_WORKER_URL: string;
  PAYMENTS_WORKER_URL: string;
  COMMS_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
  PAYMENTS_QUEUE: Queue;
  MONEY_LEDGER_ENABLED?: string;
}

export interface TierData {
  id: string;
  name: string;
  description: string;
  price: number;
  prices?: Record<string, number>;
  currency?: string;
  interval: "monthly" | "yearly";
  benefits: string[];
  isActive: boolean;
}

export interface SubscribeRequest {
  tierId: string;
  tierName: string;
  creatorId: string;
  creatorHandle: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly";
  paymentMethod: "momo" | "card";
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  request?: Request;
}

export interface CallbackPayload {
  txData: Record<string, unknown>;
  totalAmount: number;
  paymentRef: string;
  paymentMethod: "momo" | "card";
  platformShare?: number;
  creatorShare?: number;
  referralShare?: number;
}

export interface DecodedToken {
  uid: string;
  email?: string;
  [key: string]: unknown;
}
