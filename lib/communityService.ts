import { auth } from "@/db/firebase";

export const COMMUNITY_WORKER_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_WORKER_URL || "http://localhost:8794";

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
}

export interface SubscribeResponse {
  subscriptionId: string;
  paymentRef: string;
  paymentUrl?: string;
}

export interface MemberInfo {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  tierId: string;
  tierName: string;
  status: string;
  subscribedAt: string;
  expiresAt: string;
  amount: number;
  currency?: string;
  interval: string;
  autoRenew: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function getCommunityTiers(
  creatorHandle: string
): Promise<{ tiers: CommunityTier[]; enabled: boolean }> {
  const res = await fetch(
    `${COMMUNITY_WORKER_URL}/api/community/tiers?creatorHandle=${encodeURIComponent(creatorHandle)}`
  );
  if (!res.ok) return { tiers: [], enabled: false };
  return res.json();
}

export async function saveCommunityTiers(
  creatorHandle: string,
  tiers: CommunityTier[],
  enabled: boolean
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${COMMUNITY_WORKER_URL}/api/community/tiers/save`, {
    method: "POST",
    headers,
    body: JSON.stringify({ creatorHandle, tiers, enabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to save tiers" }));
    throw new Error(err.error || "Failed to save tiers");
  }
}

export async function initiateSubscription(
  data: SubscribeRequest
): Promise<SubscribeResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${COMMUNITY_WORKER_URL}/api/community/subscribe/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Subscription initiation failed" }));
    throw new Error(err.error || "Subscription initiation failed");
  }
  return res.json();
}

export async function getCommunityMembers(
  creatorHandle: string
): Promise<MemberInfo[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${COMMUNITY_WORKER_URL}/api/community/members?creatorHandle=${encodeURIComponent(creatorHandle)}`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.members || [];
}

export async function getMySubscriptions(): Promise<
  { tierId: string; status: string; expiresAt: string }[]
> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${COMMUNITY_WORKER_URL}/api/community/my-subscriptions`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.subscriptions || [];
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${COMMUNITY_WORKER_URL}/api/community/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to cancel" }));
    throw new Error(err.error || "Failed to cancel");
  }
}
