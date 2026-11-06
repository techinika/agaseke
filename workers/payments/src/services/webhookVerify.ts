import type { PaymentState } from "./stateMachine";

/**
 * Pure provider-event verification used by the webhook handlers
 * (AGA-PAY-001 / A2, AGA-PAY-003 / A3).
 */

export class WebhookError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface StoredPayment {
  ref?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  orderTrackingId?: unknown;
  pesapal_tracking_id?: unknown;
}

export interface PaypackEvent {
  ref: string;
  status: string;
  amount: number;
  currency?: string;
}

export interface PesapalStatus {
  payment_status_description?: string;
  payment_status?: string;
  status_code?: number | string;
  merchant_reference?: string;
  amount?: number | string;
  currency?: string;
  order_tracking_id?: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function currenciesMatch(a: unknown, b: unknown): boolean {
  const left = (str(a) || "RWF").toUpperCase();
  const right = (str(b) || "RWF").toUpperCase();
  return left === right;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.01;
}

export function mapPaypackStatus(raw: unknown): PaymentState | "unknown" {
  switch (str(raw).toLowerCase()) {
    case "successful":
    case "success":
    case "completed":
    case "paid":
      return "successful";
    case "pending":
    case "new":
      return "pending";
    case "processing":
    case "in_progress":
      return "processing";
    case "failed":
    case "failure":
    case "cancelled":
    case "canceled":
    case "reversed":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "unknown";
  }
}

export function mapPesapalStatus(
  description: unknown,
  statusCode?: unknown,
): PaymentState | "unknown" {
  const value = str(description).toLowerCase();
  switch (value) {
    case "completed":
    case "complete":
    case "successful":
    case "success":
      return "successful";
    case "pending":
      return "pending";
    case "processing":
    case "in progress":
      return "processing";
    case "failed":
    case "failure":
    case "cancelled":
    case "canceled":
    case "reversed":
    case "invalid":
      return "failed";
    case "expired":
      return "expired";
    default:
      break;
  }

  // Pesapal status codes: 0 INVALID, 1 COMPLETED, 2 FAILED, 3 REVERSED.
  const code = Number(statusCode);
  if (code === 1) return "successful";
  if (code === 2 || code === 3 || code === 0) return "failed";
  return "unknown";
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Paypack signs the raw request body with HMAC-SHA256 and sends the base64
 * digest in `x-paypack-signature`. Compare in constant time so a valid
 * signature cannot be guessed through timing.
 */
export async function verifyPaypackSignature(
  body: string,
  secret: string,
  signature: string | null | undefined,
): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body),
    );
    const computed = base64Encode(new Uint8Array(digest));

    if (computed.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error("HMAC verification error:", err);
    return false;
  }
}

export interface VerifiedPaypackEvent {
  state: PaymentState | "unknown";
  amount: number;
  currency: string;
}

export function verifyPaypackEvent(
  event: PaypackEvent,
  stored: StoredPayment,
): VerifiedPaypackEvent {
  const storedRef = str(stored.ref);
  if (storedRef && storedRef !== event.ref) {
    throw new WebhookError(
      "REFERENCE_MISMATCH",
      "Paypack reference does not match the stored transaction",
    );
  }

  const expectedAmount = money(stored.amount);
  if (!Number.isFinite(expectedAmount)) {
    throw new WebhookError(
      "STORED_AMOUNT_MISSING",
      "Stored transaction has no amount",
    );
  }
  if (!Number.isFinite(event.amount) || !amountsMatch(event.amount, expectedAmount)) {
    throw new WebhookError(
      "AMOUNT_MISMATCH",
      "Paypack amount does not match the stored transaction",
    );
  }

  if (!currenciesMatch(event.currency, stored.currency)) {
    throw new WebhookError(
      "CURRENCY_MISMATCH",
      "Paypack currency does not match the stored transaction",
    );
  }

  return {
    state: mapPaypackStatus(event.status),
    amount: expectedAmount,
    currency: (str(stored.currency) || "RWF").toUpperCase(),
  };
}

export interface VerifiedPesapalStatus {
  state: PaymentState | "unknown";
  bindTrackingId: boolean;
  amount: number;
  currency: string;
}

export function verifyPesapalStatus(args: {
  bodyTrackingId: string;
  bodyMerchantReference: string;
  stored: StoredPayment;
  status: PesapalStatus;
}): VerifiedPesapalStatus {
  const { bodyTrackingId, bodyMerchantReference, stored, status } = args;

  const storedRef = str(stored.ref);
  if (!storedRef || storedRef !== bodyMerchantReference) {
    throw new WebhookError(
      "MERCHANT_REFERENCE_MISMATCH",
      "Pesapal merchant reference does not match the stored transaction",
    );
  }

  const reportedRef = str(status.merchant_reference);
  if (!reportedRef) {
    throw new WebhookError(
      "MERCHANT_REFERENCE_MISSING",
      "Pesapal status response is missing the merchant reference",
    );
  }
  if (reportedRef !== storedRef) {
    throw new WebhookError(
      "MERCHANT_REFERENCE_MISMATCH",
      "Pesapal reported a different merchant reference",
    );
  }

  const reportedTrackingId = str(status.order_tracking_id);
  if (reportedTrackingId && reportedTrackingId !== bodyTrackingId) {
    throw new WebhookError(
      "TRACKING_ID_MISMATCH",
      "Pesapal reported a different order tracking ID",
    );
  }

  const storedTrackingId =
    str(stored.orderTrackingId) || str(stored.pesapal_tracking_id);
  if (storedTrackingId && storedTrackingId !== bodyTrackingId) {
    throw new WebhookError(
      "TRACKING_ID_MISMATCH",
      "Pesapal order tracking ID does not match the stored transaction",
    );
  }

  const expectedAmount = money(stored.amount);
  if (!Number.isFinite(expectedAmount)) {
    throw new WebhookError(
      "STORED_AMOUNT_MISSING",
      "Stored transaction has no amount",
    );
  }
  const reportedAmount = money(status.amount);
  if (!Number.isFinite(reportedAmount) || !amountsMatch(reportedAmount, expectedAmount)) {
    throw new WebhookError(
      "AMOUNT_MISMATCH",
      "Pesapal amount does not match the stored transaction",
    );
  }

  if (!currenciesMatch(status.currency, stored.currency)) {
    throw new WebhookError(
      "CURRENCY_MISMATCH",
      "Pesapal currency does not match the stored transaction",
    );
  }

  return {
    state: mapPesapalStatus(
      status.payment_status_description || status.payment_status,
      status.status_code,
    ),
    bindTrackingId: !storedTrackingId,
    amount: expectedAmount,
    currency: (str(stored.currency) || "RWF").toUpperCase(),
  };
}
