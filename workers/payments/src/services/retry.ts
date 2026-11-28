import type { Env, InitRequest } from "../types";
import {
  convertFromFields,
  convertToFields,
  firestoreGet,
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

const PRE_MULTI_CURRENCY_CUTOFF_MS = Date.parse("2026-12-01T00:00:00.000Z");
const STALL_TIMEOUT_MS = 15 * 60 * 1000;

function toString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function isNonEmptyUid(value: unknown): value is string {
  const s = toString(value).trim();
  return s.length > 0 && s.toLowerCase() !== "anonymous";
}

function isTransactionOwner(
  tx: Record<string, unknown>,
  uid: string,
  userEmail?: string | null,
): boolean {
  const uidCandidates = [
    tx.supporterId,
    tx.initiatedBy,
    tx.buyerId,
    tx.userId,
    tx.uid,
    tx.payerUid,
  ].filter(isNonEmptyUid);

  if (uidCandidates.some((candidate) => candidate === uid)) {
    return true;
  }

  const normalizedEmail = toString(userEmail).trim().toLowerCase();
  if (uidCandidates.length === 0 && normalizedEmail) {
    const emailCandidates = [tx.email, tx.buyerEmail, tx.attendeeEmail]
      .map((v) => toString(v).trim().toLowerCase())
      .filter(Boolean);
    if (emailCandidates.includes(normalizedEmail)) {
      return true;
    }
  }

  return false;
}

function resolveEffectiveStatus(tx: Record<string, unknown>, nowMs = Date.now()): string {
  const raw = toString(tx.status).trim().toLowerCase() || "pending";
  if (raw === "canceled") return "cancelled";
  if (raw === "stale") return "stalled";
  if (raw === "pending") {
    const tsRaw = toString(tx.initiatedAt) || toString(tx.createdAt);
    const tsMs = Date.parse(tsRaw);
    if (Number.isFinite(tsMs) && nowMs - tsMs >= STALL_TIMEOUT_MS) {
      return "stalled";
    }
  }
  return raw;
}

function resolveRetryCurrency(tx: Record<string, unknown>, stored: Record<string, unknown>): string {
  const explicit = (toString(stored.currency) || toString(tx.currency)).trim().toUpperCase();
  if (explicit) return explicit;
  const rawDate = toString(tx.createdAt) || toString(tx.successfulAt);
  if (!rawDate) return "RWF";
  const ms = Date.parse(rawDate);
  if (!Number.isFinite(ms) || ms < PRE_MULTI_CURRENCY_CUTOFF_MS) return "RWF";
  return "";
}

function extractDocId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

const CARD_LINK_FRESH_MS = 15 * 60 * 1000;

function isSafeHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

function isFreshCardLink(tx: Record<string, unknown>, nowMs = Date.now()): boolean {
  const url = toString(tx.redirectUrl).trim();
  if (!url || !isSafeHttpsUrl(url)) return false;
  const generatedRaw =
    toString(tx.redirectUrlGeneratedAt) ||
    toString(tx.updatedAt) ||
    toString(tx.initiatedAt) ||
    toString(tx.createdAt);
  if (!generatedRaw) return false;
  const generatedMs = Date.parse(generatedRaw);
  if (!Number.isFinite(generatedMs)) return false;
  return nowMs - generatedMs < CARD_LINK_FRESH_MS;
}

function inferMethod(tx: Record<string, unknown>): "momo" | "card" {
  const method = toString(tx.paymentMethod).toLowerCase();
  if (method === "card") return "card";
  if (method === "momo") return "momo";
  if (
    toString(tx.paymentProvider).toLowerCase() === "pesapal" ||
    toString(tx.ref).startsWith("AGS-CARD-") ||
    Boolean(toString(tx.redirectUrl))
  ) {
    return "card";
  }
  return "momo";
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
  const currency = resolveRetryCurrency(tx, stored);
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
  requestOrigin?: string | null;
  userEmail?: string | null;
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
  let doc = docs[0];
  if (!doc) {
    const directDoc = await firestoreGet(env, `transactions/${encodeURIComponent(ref)}`);
    if (directDoc?.fields) {
      doc = { name: directDoc.name || `transactions/${ref}`, fields: directDoc.fields };
    }
  }
  if (!doc) throw new RetryError("Transaction not found", 404);

  const docId = extractDocId(doc.name);
  const tx = convertFromFields(doc.fields);

  if (!isTransactionOwner(tx, uid, options.userEmail)) {
    throw new RetryError("You can only retry your own transactions", 403);
  }

  const status = resolveEffectiveStatus(tx);
  if (status === "successful" || status === "success" || status === "completed" || status === "paid") {
    throw new RetryError("This transaction already completed", 409);
  }

  const method: "momo" | "card" = inferMethod(tx);

  if (status === "pending" && !options.allowPending) {
    throw new RetryError(
      "This transaction is still pending. Use resume to complete the payment.",
      409,
    );
  }

  // Pending card payment with a fresh checkout link can be reopened directly.
  if (
    options.allowPending &&
    status === "pending" &&
    method === "card" &&
    isFreshCardLink(tx)
  ) {
    return {
      ref: toString(tx.ref) || docId,
      method: "card",
      redirect_url: toString(tx.redirectUrl),
      merchant_reference: toString(tx.orderTrackingId || tx.ref || docId),
    };
  }

  // Prevent spawning duplicate pending/settled payments for an already-retried or already-settled transaction.
  const previousRetriedRef = toString(tx.retriedRef);
  if (previousRetriedRef) {
    const retriedDocs = await firestoreQuery(env, "transactions", "ref", {
      stringValue: previousRetriedRef,
    }, 1);
    let retriedDoc = retriedDocs[0];
    if (!retriedDoc) {
      const directRetried = await firestoreGet(
        env,
        `transactions/${encodeURIComponent(previousRetriedRef)}`,
      );
      if (directRetried?.fields) {
        retriedDoc = {
          name: directRetried.name || `transactions/${previousRetriedRef}`,
          fields: directRetried.fields,
        };
      }
    }
    if (retriedDoc?.fields) {
      const retriedTx = convertFromFields(retriedDoc.fields);
      const retriedStatus = resolveEffectiveStatus(retriedTx);
      if (
        retriedStatus === "successful" ||
        retriedStatus === "success" ||
        retriedStatus === "completed" ||
        retriedStatus === "paid"
      ) {
        throw new RetryError("This transaction already completed", 409);
      }
      if (
        options.allowPending &&
        retriedStatus === "pending" &&
        inferMethod(retriedTx) === "card" &&
        isFreshCardLink(retriedTx)
      ) {
        return {
          ref: toString(retriedTx.ref) || previousRetriedRef,
          method: "card",
          redirect_url: toString(retriedTx.redirectUrl),
          merchant_reference: toString(retriedTx.orderTrackingId || retriedTx.ref || previousRetriedRef),
        };
      }
    }
  }

  const txType = toString(tx.type);
  if (txType === "booking" && toString(tx.bookingId)) {
    const bookingDoc = await firestoreGet(env, `bookingRequests/${toString(tx.bookingId)}`);
    if (bookingDoc?.fields) {
      const booking = convertFromFields(bookingDoc.fields);
      if (toString(booking.paymentStatus).toLowerCase() === "paid") {
        throw new RetryError("This booking has already been paid", 409);
      }
    }
  }
  if (txType === "store" && toString(tx.orderId)) {
    const orderDoc = await firestoreGet(env, `storeOrders/${toString(tx.orderId)}`);
    if (orderDoc?.fields) {
      const order = convertFromFields(orderDoc.fields);
      const orderStatus = toString(order.status).toLowerCase();
      if (["paid", "processing", "shipped", "delivered", "completed"].includes(orderStatus)) {
        throw new RetryError("This order has already been paid", 409);
      }
    }
  }

  const currency = resolveRetryCurrency(tx, {});
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
    result = await initiateCardPayment(env, payload, uid, idempotencyKey, {
      requestOrigin: options.requestOrigin,
    });
  }

  const nowIso = new Date().toISOString();
  await firestoreSet(
    env,
    `transactions/${docId}`,
    convertToFields({
      ...tx,
      retried: true,
      retriedAt: nowIso,
      retriedRef: result.ref,
      retryCount: attemptNumber,
      ...(result.redirect_url
        ? { redirectUrl: result.redirect_url, redirectUrlGeneratedAt: nowIso }
        : {}),
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

export async function cancelTransaction(
  env: Env,
  uid: string,
  ref: string,
  userEmail?: string | null,
): Promise<{ ref: string; status: "cancelled" }> {
  const cleanRef = toString(ref).trim();
  if (!cleanRef) throw new RetryError("Transaction reference is required", 400);

  const docs = await firestoreQuery(env, "transactions", "ref", {
    stringValue: cleanRef,
  }, 1);
  let doc = docs[0];
  if (!doc) {
    const directDoc = await firestoreGet(env, `transactions/${encodeURIComponent(cleanRef)}`);
    if (directDoc?.fields) {
      doc = { name: directDoc.name || `transactions/${cleanRef}`, fields: directDoc.fields };
    }
  }
  if (!doc) throw new RetryError("Transaction not found", 404);

  const docId = extractDocId(doc.name);
  const tx = convertFromFields(doc.fields);

  if (!isTransactionOwner(tx, uid, userEmail)) {
    throw new RetryError("You can only cancel your own transactions", 403);
  }

  const currentStatus = toString(tx.status).toLowerCase() || "pending";
  if (["successful", "success", "completed", "paid"].includes(currentStatus)) {
    throw new RetryError("Completed transactions cannot be cancelled", 409);
  }

  const resolvedRef = toString(tx.ref) || docId;
  if (currentStatus === "cancelled" || currentStatus === "canceled") {
    return { ref: resolvedRef, status: "cancelled" };
  }

  const nowIso = new Date().toISOString();
  await firestoreSet(
    env,
    `transactions/${docId}`,
    convertToFields({
      ...tx,
      status: "cancelled",
      cancelledAt: nowIso,
      cancelledBy: "user",
      updatedAt: nowIso,
    }),
  );

  const retriedRef = toString(tx.retriedRef);
  if (retriedRef && retriedRef !== resolvedRef) {
    const retriedDocs = await firestoreQuery(env, "transactions", "ref", {
      stringValue: retriedRef,
    }, 1);
    const rDoc = retriedDocs[0];
    if (rDoc?.fields) {
      const rTx = convertFromFields(rDoc.fields);
      const rStatus = toString(rTx.status).toLowerCase() || "pending";
      if (rStatus === "pending" || rStatus === "stalled") {
        await firestoreSet(
          env,
          `transactions/${extractDocId(rDoc.name)}`,
          convertToFields({
            ...rTx,
            status: "cancelled",
            cancelledAt: nowIso,
            cancelledBy: "user",
            updatedAt: nowIso,
          }),
        );
      }
    }
  }

  return { ref: resolvedRef, status: "cancelled" };
}
