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
