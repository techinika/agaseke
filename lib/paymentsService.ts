import { auth } from "@/db/firebase";

export const PAYMENTS_WORKER_URL =
  process.env.NEXT_PUBLIC_PAYMENTS_WORKER_URL || "http://localhost:8787";

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
  currency?: string;
}

export interface CardInitRequest extends MomoInitRequest {
  firstName?: string;
  lastName?: string;
  buyerId?: string;
}

export interface MomoInitResponse {
  ref: string;
}

export interface CardInitResponse {
  redirect_url: string;
  ref: string;
  merchant_reference: string;
}

export interface UserTransaction {
  ref: string;
  type: string;
  status: string;
  currency: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
  successfulAt: string;
  message: string;
  creatorId: string;
  creatorUid: string;
  creatorName: string;
  productId: string;
  productName: string;
  quantity: number;
  selectedSize: string;
  bookingId: string;
  gatheringId: string;
  attendeeName: string;
  communityTierId: string;
  communityInterval: string;
  communitySubscriptionId: string;
}

export interface RetryTransactionResponse {
  ref: string;
  method: "momo" | "card";
  redirect_url?: string;
  merchant_reference?: string;
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

export async function initiateMomoPayment(
  data: MomoInitRequest,
): Promise<MomoInitResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/momo/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorMessage = "Momo payment failed to initiate";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function initiateCardPayment(
  data: CardInitRequest,
): Promise<CardInitResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/card/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorMessage = "Card payment failed to initiate";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return res.json();
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const err = (await res.json()) as { error?: string };
      if (err.error) return err.error;
    }
  } catch {}
  return fallback;
}

export async function getUserTransactions(): Promise<UserTransaction[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/transactions`, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to load transactions"));
  }

  const data = (await res.json()) as { transactions?: UserTransaction[] };
  return data.transactions || [];
}

export async function retryTransaction(
  ref: string,
): Promise<RetryTransactionResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/transactions/retry`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ref }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to retry payment"));
  }

  return res.json() as Promise<RetryTransactionResponse>;
}
