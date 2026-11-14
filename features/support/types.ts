export type SupportStep = "amount" | "pay" | "status";

export type SupportStatus = "idle" | "waiting" | "success" | "failed";

export type SupportMethod = "momo" | "card";

export type MobileNetwork = "MTN" | "Airtel";

export interface SupportCreator {
  uid: string;
  handle: string;
  name: string;
  photoURL?: string | null;
  verified?: boolean;
  currency?: string;
  storeEnabled?: boolean;
  giveawayEnabled?: boolean;
  gatheringsEnabled?: boolean;
  communityEnabled?: boolean;
  bookingEnabled?: boolean;
}

export interface SupportDraft {
  amount: number | "";
  message: string;
  method: SupportMethod;
  network: MobileNetwork;
  phone: string;
}

export interface SupportConfig {
  currency: string;
  minAmount: number;
  creatorShare: number;
}

export interface SupportBreakdown {
  total: number;
  fee: number;
  creatorReceives: number;
}

export interface PendingSupport {
  handle: string;
  reference: string;
  amount: number;
  currency: string;
  method: SupportMethod;
  createdAt: number;
  redirectUrl?: string;
}

export interface TransactionSnapshot {
  ref: string;
  status: string;
  amount?: number;
  currency?: string;
  type?: string;
}
