import { auth } from "@/db/firebase";

export const PAYMENTS_WORKER_URL =
  process.env.NEXT_PUBLIC_PAYMENTS_WORKER_URL || "http://localhost:8787";

export type TransactionType =
  | "support"
  | "gift"
  | "booking"
  | "gathering"
  | "store"
  | "community";

export interface StoreCheckoutItem {
  productId: string;
  quantity: number;
  selectedSize?: string;
}

export interface ShippingAddressInput {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Client-supplied identifiers and non-authoritative metadata only. The worker
 * derives amount, currency, creator UID, fees and referral server-side.
 */
export interface PaymentInitRequest {
  creatorHandle?: string;
  /** @deprecated Legacy alias for creatorHandle. */
  creatorId?: string;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  phone?: string;
  message?: string;
  productId?: string;
  quantity?: number;
  selectedSize?: string;
  items?: StoreCheckoutItem[];
  shippingAddress?: ShippingAddressInput;
  orderId?: string;
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

export type MomoInitRequest = PaymentInitRequest;
export type CardInitRequest = PaymentInitRequest;

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
  sourceCurrency: string;
  sourceAmountMinor: number;
  fxRate: number;
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
  redirectUrl?: string;
  redirectUrlGeneratedAt?: string;
  phone?: string;
}

export interface RetryTransactionResponse {
  ref: string;
  method: "momo" | "card";
  redirect_url?: string;
  merchant_reference?: string;
}

export interface TransactionsResponse {
  transactions: UserTransaction[];
  total: number;
  counts: Record<string, number>;
  limit: number;
  offset: number;
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

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      if (parsed.error) return parsed.error;
      if (parsed.message) return parsed.message;
    } catch {}
    const trimmed = raw.trim();
    if (trimmed && !trimmed.startsWith("<")) {
      return trimmed.slice(0, 200);
    }
  } catch {}
  return fallback;
}

export async function initiateMomoPayment(
  data: MomoInitRequest,
  idempotencyKey?: string,
): Promise<MomoInitResponse> {
  const headers = await getAuthHeaders();
  const key = idempotencyKey || data.idempotencyKey;
  const payload = key ? { ...data, idempotencyKey: key } : data;

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/momo/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Momo payment failed to initiate"));
  }

  return res.json();
}

export async function initiateCardPayment(
  data: CardInitRequest,
  idempotencyKey?: string,
): Promise<CardInitResponse> {
  const headers = await getAuthHeaders();
  const key = idempotencyKey || data.idempotencyKey;
  const payload = key ? { ...data, idempotencyKey: key } : data;

  const res = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/card/initiate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Card payment failed to initiate"));
  }

  return res.json();
}

export interface PaymentMethodOption {
  method: "momo" | "card";
  provider: string;
  label: string;
}

export async function getPaymentMethods(
  currency: string,
  country?: string,
): Promise<PaymentMethodOption[]> {
  const params = new URLSearchParams({ currency });
  if (country) params.set("country", country);
  const res = await fetch(
    `${PAYMENTS_WORKER_URL}/api/payments/methods?${params.toString()}`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to load payment methods"));
  }
  const data = (await res.json()) as { methods?: PaymentMethodOption[] };
  return Array.isArray(data.methods) ? data.methods : [];
}

export async function getUserTransactions(
  limit = 20,
  offset = 0,
): Promise<TransactionsResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(
    `${PAYMENTS_WORKER_URL}/api/payments/transactions?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
    },
  );

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to load transactions"));
  }

  return (await res.json()) as TransactionsResponse;
}

async function postTransactionRecovery(
  endpoint: "retry" | "resume",
  ref: string,
  phone?: string,
): Promise<RetryTransactionResponse> {
  const headers = await getAuthHeaders();
  const body = JSON.stringify({ ref, ...(phone ? { phone } : {}) });
  const fallbackMsg =
    endpoint === "resume" ? "Failed to resume payment" : "Failed to retry payment";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    let workerRes: Response | null = null;
    try {
      workerRes = await fetch(
        `${PAYMENTS_WORKER_URL}/api/payments/transactions/${endpoint}`,
        {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        },
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      workerRes = null;
    }

    if (workerRes && workerRes.ok) {
      return (await workerRes.json()) as RetryTransactionResponse;
    }

    // Fall back to the Next.js server route when the worker does not serve this
    // endpoint yet (404), rejects legacy anonymous ownership (403), or is unreachable.
    if (
      !workerRes ||
      workerRes.status === 403 ||
      workerRes.status === 404 ||
      workerRes.status >= 500
    ) {
      const localRes = await fetch(`/api/payments/transactions/${endpoint}`, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      if (localRes.ok) {
        return (await localRes.json()) as RetryTransactionResponse;
      }
      throw new Error(await parseError(localRes, fallbackMsg));
    }

    throw new Error(await parseError(workerRes, fallbackMsg));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        endpoint === "retry"
          ? "Retry request timed out. Check your connection and try again."
          : "Request timed out. Check your connection and try again.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function retryTransaction(
  ref: string,
  phone?: string,
): Promise<RetryTransactionResponse> {
  return postTransactionRecovery("retry", ref, phone);
}

export async function resumeTransaction(
  ref: string,
  phone?: string,
): Promise<RetryTransactionResponse> {
  return postTransactionRecovery("resume", ref, phone);
}

export interface CancelTransactionResponse {
  ref: string;
  status: "cancelled";
}

export async function cancelTransaction(
  ref: string,
): Promise<CancelTransactionResponse> {
  const headers = await getAuthHeaders();
  const body = JSON.stringify({ ref });
  const fallbackMsg = "Failed to cancel payment";

  let workerRes: Response | null = null;
  try {
    workerRes = await fetch(`${PAYMENTS_WORKER_URL}/api/payments/transactions/cancel`, {
      method: "POST",
      headers,
      body,
    });
  } catch {
    workerRes = null;
  }

  if (workerRes && workerRes.ok) {
    return (await workerRes.json()) as CancelTransactionResponse;
  }

  if (
    !workerRes ||
    workerRes.status === 403 ||
    workerRes.status === 404 ||
    workerRes.status >= 500
  ) {
    const localRes = await fetch("/api/payments/transactions/cancel", {
      method: "POST",
      headers,
      body,
    });
    if (localRes.ok) {
      return (await localRes.json()) as CancelTransactionResponse;
    }
    throw new Error(await parseError(localRes, fallbackMsg));
  }

  throw new Error(await parseError(workerRes, fallbackMsg));
}

export async function cancelStoreOrder(
  orderId: string,
): Promise<{ orderId: string; status: "cancelled" }> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/store/orders/cancel", {
    method: "POST",
    headers,
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to cancel order"));
  }
  return (await res.json()) as { orderId: string; status: "cancelled" };
}
