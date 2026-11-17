import type { Env, InitRequest, PaymentInitResult } from "../types";
import { convertToFields, firestorePost } from "../firestore";
import { logActivity } from "../logger";
import { notifyAdmins } from "../adminNotifications";
import { PaymentRequestError, resolvePayment } from "./pricing";
import { assertMethodSupportsCurrency } from "../money/rails";
import { consumeCheckoutQuote, loadCheckoutQuote } from "./quotes";
import { createPaymentRepository } from "./repository";
import {
  abortAttempt,
  beginIdempotentAttempt,
  buildRetryPayload,
  finishAttempt,
} from "./initiate";

function requirePhone(body: InitRequest): string {
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    throw new PaymentRequestError(
      "MISSING_PHONE",
      "Phone number is required for MoMo payments",
    );
  }
  return phone;
}

export async function initiateMomoPayment(
  env: Env,
  body: InitRequest,
  uid: string,
  idempotencyKey?: string,
): Promise<PaymentInitResult> {
  const phone = requirePhone(body);
  const repo = createPaymentRepository(env);
  const quote = await loadCheckoutQuote(repo, body.quoteId, uid, body);
  const resolved = await resolvePayment(env, body, uid, repo, { quote });

  try {
    assertMethodSupportsCurrency("momo", resolved.currency);
  } catch (error) {
    throw new PaymentRequestError(
      "UNSUPPORTED_METHOD",
      `Mobile Money cannot charge ${resolved.currency}. Use card payment instead.`,
    );
  }

  const attempt = await beginIdempotentAttempt(
    env,
    resolved,
    body,
    uid,
    idempotencyKey,
  );

  if (attempt.duplicate && attempt.existing?.ref) {
    return {
      ref: attempt.existing.ref,
      status: "pending",
      redirect_url: attempt.existing.redirectUrl || undefined,
      merchant_reference: attempt.existing.merchantReference || undefined,
    };
  }

  try {
    const authRes = await fetch(
      "https://payments.paypack.rw/api/auth/agents/authorize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.PAYPACK_CLIENT_ID,
          client_secret: env.PAYPACK_CLIENT_SECRET,
        }),
      },
    );

    if (!authRes.ok) {
      const errText = await authRes.text();
      console.error("Paypack auth error:", authRes.status, errText);
      await logActivity(env, "error", "payment", "Momo pay: Paypack auth failed", {
        status: authRes.status,
        error: errText.slice(0, 500),
      });
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Paypack authentication failed",
        502,
      );
    }

    const { access } = (await authRes.json()) as { access: string };

    const payRes = await fetch(
      "https://payments.paypack.rw/api/transactions/cashin",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
          "X-Webhook-Mode": "production",
        },
        body: JSON.stringify({ amount: resolved.totalAmount, number: phone }),
      },
    );

    const payData = (await payRes.json().catch(() => ({}))) as {
      ref?: string;
    };

    if (!payRes.ok || !payData.ref) {
      await logActivity(env, "error", "payment", "Momo pay: No ref returned", {
        amount: resolved.totalAmount,
        creatorHandle: resolved.creatorHandle,
        status: payRes.status,
      });
      throw new PaymentRequestError(
        "PROVIDER_INITIATION_FAILED",
        "Payment failed to initiate with Paypack",
        502,
      );
    }

    const now = new Date().toISOString();
    const txFields: Record<string, unknown> = {
      ref: payData.ref,
      amount: resolved.totalAmount,
      currency: resolved.currency,
      phone,
      creatorId: resolved.creatorHandle,
      creatorHandle: resolved.creatorHandle,
      creatorUid: resolved.creatorUid,
      supporterId: uid,
      buyerId: uid,
      includeReferral: resolved.includeReferral,
      referralUid: resolved.referralUid,
      referralId: resolved.referralId,
      status: "pending",
      message: typeof body.message === "string" ? body.message : "",
      type: resolved.type,
      paymentMethod: "momo",
      paymentProvider: "paypack",
      providerRef: payData.ref,
      idempotencyKey: attempt.key,
      quoteId: body.quoteId || "",
      platformFee: resolved.platformFee,
      creatorEarnings: resolved.creatorEarnings,
      referralEarnings: resolved.referralEarnings,
      processorCost: resolved.processorCost,
      ...(resolved.fx
        ? {
            fxQuoteId: resolved.fx.id,
            fxRate: resolved.fx.rate,
            fxSpreadBps: resolved.fx.spreadBps,
            sourceCurrency: resolved.fx.fromCurrency,
            sourceAmountMinor: resolved.fx.sourceAmountMinor,
            targetAmountMinor: resolved.fx.targetAmountMinor,
            rateSource: resolved.fx.rateSource,
            rateTimestamp: resolved.fx.rateTimestamp,
            quoteExpiresAt: resolved.fx.expiresAt,
          }
        : {}),
      createdAt: now,
      initiatedAt: now,
      updatedAt: now,
      initiatedBy: uid,
      retryPayload: buildRetryPayload(resolved, body),
    };

    if (resolved.type === "store") {
      txFields.productId = resolved.productId;
      txFields.productPrice = resolved.productPrice;
      txFields.productName = resolved.productName || "";
      txFields.quantity = resolved.quantity;
      txFields.selectedSize = resolved.selectedSize || "";
      txFields.platformFeePayer = resolved.platformFeePayer;
      txFields.couponCode = resolved.couponCode || "";
      txFields.discount = resolved.discount || 0;
      txFields.buyerName = resolved.buyerName || "";
      txFields.buyerEmail = resolved.buyerEmail || "";
    }

    if (resolved.type === "booking") {
      txFields.bookingId = resolved.bookingId;
      txFields.buyerName = resolved.buyerName || "";
      txFields.buyerEmail = resolved.buyerEmail || "";
    }

    if (resolved.type === "gathering") {
      txFields.gatheringId = resolved.gatheringId;
      txFields.attendeeName = resolved.attendeeName || "";
      txFields.attendeeEmail = resolved.attendeeEmail || "";
      txFields.attendeePhoto = resolved.attendeePhoto || "";
    }

    if (resolved.type === "community") {
      txFields.communityTierId = resolved.communityTierId;
      txFields.communityInterval = resolved.communityInterval || "";
      txFields.communitySubscriptionId =
        resolved.communitySubscriptionId || "";
    }

    const doc = await firestorePost(env, "transactions", {
      fields: convertToFields(txFields),
    });

    if (!doc) {
      await finishAttempt(env, attempt.key, { ref: payData.ref });
      throw new PaymentRequestError(
        "TRANSACTION_PERSIST_FAILED",
        `Payment ${payData.ref} was initiated but could not be recorded. Contact support with this reference.`,
        502,
      );
    }

    await finishAttempt(env, attempt.key, { ref: payData.ref });

    if (resolved.fx) {
      await consumeCheckoutQuote(env, resolved.fx.id, payData.ref);
    }

    const txTypeLabel =
      resolved.type === "community"
        ? "Community subscription"
        : resolved.type === "gathering"
          ? "Gathering ticket"
          : resolved.type === "booking"
            ? "Booking payment"
            : resolved.type === "store"
              ? "Store purchase"
              : "Support";

    await notifyAdmins(
      env,
      "New Transaction",
      `${txTypeLabel} of ${resolved.totalAmount.toLocaleString()} ${resolved.currency} initiated`,
      "/admin/payouts",
    );

    return { ref: payData.ref, status: "pending" };
  } catch (error) {
    await abortAttempt(env, attempt.key, error);
    throw error;
  }
}
