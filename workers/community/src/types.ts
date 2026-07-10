export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  PAYMENTS_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
  COMMUNITY_WORKER_URL: string;
}

export interface TierData {
  id: string;
  name: string;
  description: string;
  price: number;
  priceUSD?: number;
  currency?: "RWF" | "USD";
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
  interval: "monthly" | "yearly";
  paymentMethod: "momo" | "card";
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  supporterId?: string;
  currency?: string;
  request?: Request;
}

export interface CallbackPayload {
  txData: Record<string, unknown>;
  totalAmount: number;
  paymentRef: string;
  paymentMethod: "momo" | "card";
}
