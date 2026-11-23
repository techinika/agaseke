import type { Env, InitRequest } from "../types";
import {
  convertFromFields,
  convertToFields,
  firestoreQuery,
  firestoreSet,
} from "../firestore";
import { initiateMomoPayment } from "./momo";
import { initiateCardPayment } from "./card";
import { isCurrencySupportedByMethod } from "../money/rails";

export class RetryError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface RetryResult {
  ref: string;
  method: "momo" | "card";
  redirect_url: string;
  merchant_reference: string;
}

function toString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function extractDocId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

const COPY_FIELDS = [
  "phone",
  "message",
  "email",
  "buyerEmail",
  "buyerName",
  "firstName",
  "lastName",
  "productId",
  "quantity",
  "selectedSize",
  "items",
  "shippingAddress",
  "orderId",
  "couponCode",
  "bookingId",
  "gatheringId",
  "attendeeName",
  "attendeeEmail",
  "attendeePhoto",
  "communityTierId",
  "communityInterval",
  "communitySubscriptionId",
] as const;

/**
 * Rebuild a retry request from identifiers only. Legacy rows may have stored a
 * full client body in `retryPayload`; monetary and identity fields from it are
 * deliberately ignored and re-derived by the payments worker.
 */
function buildPayload(tx: Record<string, unknown>): InitRequest {
  const stored =
    tx.retryPayload && typeof tx.retryPayload === "object"
      ? (tx.retryPayload as Record<string, unknown>)
      : {};

  const type = toString(stored.type) || toString(tx.type) || "support";
  const currency = toString(stored.currency) || toString(tx.currency);
  if (!currency) {
    throw new RetryError("Transaction is missing currency and cannot be retried", 400);
  }
  const payload: Record<string, unknown> = {
    creatorHandle:
      toString(stored.creatorHandle) ||
      toString(tx.creatorHandle) ||
      toString(tx.creatorId),
    type,
    currency,
  };

  if (type === "support" || type === "gift") {
    const amount = tx.amount ?? stored.amount;
    if (amount !== undefined && amount !== null) payload.amount = amount;
  }

  for (const field of COPY_FIELDS) {
    const value = stored[field] ?? tx[field];
    if (value !== undefined && value !== null && value !== "") {
      payload[field] = value;
    }
  }

  if (!payload.phone && tx.phone) payload.phone = toString(tx.phone);

  return payload as InitRequest;
}

export interface RetryOptions {
  allowPending?: boolean;
  phone?: string;
}

export async function retryTransaction(
  env: Env,
  uid: string,
  ref: string,
  options: RetryOptions = {},
): Promise<RetryResult> {
  if (!ref) throw new RetryError("Transaction reference is required", 400);

  const docs = await firestoreQuery(env, "transactions", "ref", {
    stringValue: ref,
  }, 1);
  const doc = docs[0];
  if (!doc) throw new RetryError("Transaction not found", 404);

  const docId = extractDocId(doc.name);
  const tx = convertFromFields(doc.fields);

  const owner = toString(tx.supporterId || tx.initiatedBy);
  if (!owner || owner !== uid) {
    throw new RetryError("You can only retry your own transactions", 403);
  }

  const status = toString(tx.status) || "pending";
  if (status === "successful" || status === "success") {
    throw new RetryError("This transaction already completed", 409);
  }

  const method: "momo" | "card" =
    toString(tx.paymentMethod) === "card" ? "card" : "momo";

  if (status === "pending" && !options.allowPending) {
    throw new RetryError(
      "This transaction is still pending. Use resume to complete the payment.",
      409,
    );
  }

  // Pending card payment with an existing checkout link can be reopened directly.
  if (
    options.allowPending &&
    status === "pending" &&
    method === "card" &&
    toString(tx.redirectUrl)
  ) {
    return {
      ref: toString(tx.ref),
      method: "card",
      redirect_url: toString(tx.redirectUrl),
      merchant_reference: toString(tx.orderTrackingId || tx.ref),
    };
  }

  const currency = toString(tx.currency);
  if (!currency) {
    throw new RetryError("Transaction is missing currency and cannot be retried", 400);
  }
  if (method === "momo" && !isCurrencySupportedByMethod("momo", currency)) {
    throw new RetryError(
      `Mobile Money only supports RWF (this transaction is ${currency}). Pay by card instead.`,
      400,
    );
  }

  const payload = buildPayload(tx);
  const overridePhone = options.phone?.trim();
  if (overridePhone) {
    payload.phone = overridePhone;
  }

  if (method === "momo" && !toString(payload.phone).trim()) {
    throw new RetryError("A Mobile Money phone number is required to complete this payment.", 400);
  }

  const attemptNumber = Number(tx.retryCount || 0) + 1;
  const prefix = options.allowPending ? "resume" : "retry";
  const idempotencyKey = `${prefix}_${docId}_${attemptNumber}`;

  let result: {
    ref: string;
    redirect_url?: string;
    merchant_reference?: string;
  };
  if (method === "momo") {
    result = await initiateMomoPayment(env, payload, uid, idempotencyKey);
  } else {
    if (!payload.email) payload.email = "supporter@agaseke.me";
    result = await initiateCardPayment(env, payload, uid, idempotencyKey);
  }

  await firestoreSet(
    env,
    `transactions/${docId}`,
    convertToFields({
      ...tx,
      retried: true,
      retriedAt: new Date().toISOString(),
      retriedRef: result.ref,
      retryCount: attemptNumber,
      ...(overridePhone ? { phone: overridePhone } : {}),
    }),
  );

  return {
    ref: result.ref,
    method,
    redirect_url: result.redirect_url || "",
    merchant_reference: result.merchant_reference || "",
  };
}
