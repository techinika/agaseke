import type { Env, MomoInitRequest, CardInitRequest } from "../types";
import { firestoreQuery, firestoreSet, convertFromFields, convertToFields } from "../firestore";
import { initiateMomoPayment } from "./momo";
import { initiateCardPayment } from "./card";

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

function buildPayload(tx: Record<string, unknown>, uid: string): MomoInitRequest {
  const stored =
    tx.retryPayload && typeof tx.retryPayload === "object"
      ? { ...(tx.retryPayload as Record<string, unknown>) }
      : {};

  const base: Record<string, unknown> = {
    ...stored,
    amount: tx.amount ?? stored.amount,
    creatorId: toString(tx.creatorId) || toString(stored.creatorId),
    creatorUid: toString(tx.creatorUid) || toString(stored.creatorUid),
    supporterId: uid,
    currency: toString(tx.currency) || toString(stored.currency) || "RWF",
  };

  base.message = toString(tx.message) || toString(stored.message) || "";
  base.includeReferral = Boolean(tx.includeReferral ?? stored.includeReferral);
  base.referralUid = toString(tx.referralUid) || toString(stored.referralUid);
  base.referralId = toString(tx.referralId) || toString(stored.referralId);

  if (tx.phone) base.phone = toString(tx.phone);

  base.productId = base.productId ?? tx.productId;
  base.productPrice = base.productPrice ?? tx.productPrice;
  base.productName = toString(base.productName || tx.productName);
  base.quantity = base.quantity ?? tx.quantity ?? 1;
  base.selectedSize = toString(base.selectedSize || tx.selectedSize);
  base.platformFeePayer = toString(base.platformFeePayer || tx.platformFeePayer);
  base.buyerName = toString(base.buyerName || tx.buyerName);
  const email =
    toString(stored.email) ||
    toString(stored.buyerEmail) ||
    toString(tx.buyerEmail) ||
    toString(tx.attendeeEmail);
  if (email) base.email = email;
  base.buyerEmail = toString(base.buyerEmail || tx.buyerEmail);

  base.bookingId = base.bookingId ?? tx.bookingId;
  base.gatheringId = base.gatheringId ?? tx.gatheringId;
  base.attendeeName = toString(base.attendeeName || tx.attendeeName);
  base.attendeeEmail = toString(base.attendeeEmail || tx.attendeeEmail);
  base.attendeePhoto = toString(base.attendeePhoto || tx.attendeePhoto);
  base.communityTierId = base.communityTierId ?? tx.communityTierId;
  base.communityInterval = toString(base.communityInterval || tx.communityInterval);
  base.communitySubscriptionId = base.communitySubscriptionId ?? tx.communitySubscriptionId;

  return base as unknown as MomoInitRequest;
}

export async function retryTransaction(
  env: Env,
  uid: string,
  ref: string
): Promise<RetryResult> {
  if (!ref) throw new RetryError("Transaction reference is required", 400);

  const docs = await firestoreQuery(env, "transactions", "ref", { stringValue: ref }, 1);
  const doc = docs[0];
  if (!doc) throw new RetryError("Transaction not found", 404);

  const docId = extractDocId(doc.name);
  const tx = convertFromFields(doc.fields);

  const owner = toString(tx.supporterId || tx.initiatedBy);
  if (!owner || owner !== uid) {
    throw new RetryError("You can only retry your own transactions", 403);
  }

  const status = toString(tx.status) || "pending";
  if (status === "successful") {
    throw new RetryError("This transaction already completed", 409);
  }
  if (status === "pending") {
    throw new RetryError(
      "This transaction is still pending and may still complete. Wait a few minutes before retrying.",
      409
    );
  }

  const method: "momo" | "card" = toString(tx.paymentMethod) === "card" ? "card" : "momo";
  const currency = toString(tx.currency) || "RWF";
  if (method === "momo" && currency !== "RWF") {
    throw new RetryError(
      `Mobile Money only supports RWF (this transaction is ${currency}). Pay by card instead.`,
      400
    );
  }

  const payload = buildPayload(tx, uid);

  let result: { ref: string; redirect_url?: string; merchant_reference?: string };
  if (method === "momo") {
    result = await initiateMomoPayment(env, payload as MomoInitRequest, uid);
  } else {
    result = await initiateCardPayment(env, payload as CardInitRequest, uid);
  }

  await firestoreSet(
    env,
    `transactions/${docId}`,
    convertToFields({
      ...tx,
      retried: true,
      retriedAt: new Date().toISOString(),
      retriedRef: result.ref,
    })
  );

  return {
    ref: result.ref,
    method,
    redirect_url: result.redirect_url || "",
    merchant_reference: result.merchant_reference || "",
  };
}