import type { Env, InitRequest } from "../types";
import { PaymentRequestError, type ResolvedPayment } from "./pricing";
import {
  completeAttempt,
  failAttempt,
  hashRequest,
  normalizeIdempotencyKey,
  reserveAttempt,
  type IdempotencyAttempt,
} from "./idempotency";

export interface IdempotentStart {
  key: string;
  duplicate: boolean;
  existing?: IdempotencyAttempt;
}

export function buildRetryPayload(
  resolved: ResolvedPayment,
  body: InitRequest,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    creatorHandle: resolved.creatorHandle,
    type: resolved.type,
    currency: resolved.currency,
    message: typeof body.message === "string" ? body.message : "",
  };

  if (resolved.type === "support" || resolved.type === "gift") {
    payload.amount = resolved.totalAmount;
  }

  if (body.phone) payload.phone = body.phone;
  if (body.email) payload.email = body.email;
  if (body.buyerEmail) payload.buyerEmail = body.buyerEmail;
  if (body.buyerName) payload.buyerName = body.buyerName;
  if (body.firstName) payload.firstName = body.firstName;
  if (body.lastName) payload.lastName = body.lastName;

  if (resolved.productId) {
    payload.productId = resolved.productId;
    payload.quantity = resolved.quantity;
    if (resolved.selectedSize) payload.selectedSize = resolved.selectedSize;
    if (resolved.couponCode) payload.couponCode = resolved.couponCode;
  }
  if (resolved.bookingId) payload.bookingId = resolved.bookingId;
  if (resolved.gatheringId) {
    payload.gatheringId = resolved.gatheringId;
    if (resolved.attendeeName) payload.attendeeName = resolved.attendeeName;
    if (resolved.attendeeEmail) payload.attendeeEmail = resolved.attendeeEmail;
    if (resolved.attendeePhoto) payload.attendeePhoto = resolved.attendeePhoto;
  }
  if (resolved.communityTierId) {
    payload.communityTierId = resolved.communityTierId;
    payload.communityInterval = resolved.communityInterval;
    payload.communitySubscriptionId = resolved.communitySubscriptionId;
  }

  return payload;
}

export async function beginIdempotentAttempt(
  env: Env,
  resolved: ResolvedPayment,
  body: InitRequest,
  uid: string,
  rawKey: unknown,
): Promise<IdempotentStart> {
  const provided =
    normalizeIdempotencyKey(rawKey) ||
    normalizeIdempotencyKey(body.idempotencyKey) ||
    `auto_${crypto.randomUUID()}`;

  const requestHash = await hashRequest({
    uid,
    type: resolved.type,
    creatorHandle: resolved.creatorHandle,
    currency: resolved.currency,
    amount: resolved.totalAmount,
    productId: resolved.productId,
    bookingId: resolved.bookingId,
    gatheringId: resolved.gatheringId,
    communityTierId: resolved.communityTierId,
    communitySubscriptionId: resolved.communitySubscriptionId,
    quantity: resolved.quantity,
  });

  const reservation = await reserveAttempt(env, provided, {
    uid,
    requestHash,
    type: resolved.type,
    creatorHandle: resolved.creatorHandle,
    amount: resolved.totalAmount,
    currency: resolved.currency,
  });

  if (reservation.created) {
    return { key: provided, duplicate: false };
  }

  const existing = reservation.existing;
  if (!existing || existing.requestHash !== requestHash) {
    throw new PaymentRequestError(
      "IDEMPOTENCY_KEY_REUSED",
      "This idempotency key was already used for a different payment",
      409,
    );
  }

  if (existing.ref) {
    return { key: provided, duplicate: true, existing };
  }

  throw new PaymentRequestError(
    "PAYMENT_IN_PROGRESS",
    "A payment with this idempotency key is already being processed",
    409,
  );
}

export async function finishAttempt(
  env: Env,
  key: string,
  result: {
    ref: string;
    redirectUrl?: string;
    merchantReference?: string;
  },
): Promise<void> {
  await completeAttempt(env, key, {
    ref: result.ref,
    redirectUrl: result.redirectUrl || "",
    merchantReference: result.merchantReference || "",
  });
}

export async function abortAttempt(
  env: Env,
  key: string,
  error: unknown,
): Promise<void> {
  await failAttempt(env, key, error);
}
