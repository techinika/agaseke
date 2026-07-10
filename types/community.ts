export interface CommunityTier {
  id: string;
  name: string;
  description: string;
  price: number;
  priceUSD?: number;
  currency?: "RWF" | "USD";
  interval: "monthly" | "yearly";
  benefits: string[];
  isActive: boolean;
  memberCount?: number;
}

export interface Subscription {
  id: string;
  tierId: string;
  tierName: string;
  userId: string;
  userEmail: string;
  userName: string;
  creatorId: string;
  creatorHandle: string;
  subscribedAt: string;
  expiresAt: string;
  status: "active" | "cancelled" | "expired" | "pending";
  paymentMethod: "momo" | "card";
  autoRenew: boolean;
  amount: number;
  currency?: string;
  interval: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface CommunityMember {
  id: string;
  subscription: Subscription;
  joinedAt: string;
  lastPaymentAt: string;
}
