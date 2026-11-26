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

function normalizeMomoPhone(raw: unknown): string {
  const input = typeof raw === "string" ? raw.trim() : "";
  if (!input) {
    throw new PaymentRequestError(
      "MISSING_PHONE",
      "Phone number is required for MoMo payments",
    );
  }
  const digits = input.replace(/\D/g, "");
  let local = "";
  if (/^07[2389]\d{7}$/.test(digits)) {
    local = digits;
  } else if (/^2507[2389]\d{7}$/.test(digits)) {
    local = `0${digits.slice(3)}`;
  } else if (/^7[2389]\d{7}$/.test(digits)) {
    local = `0${digits}`;
  }
  if (!local) {
    throw new PaymentRequestError(
      "INVALID_PHONE",
      "Enter a valid Rwanda Mobile Money number (e.g. 078 000 0000)",
    );
  }
  return local;
}

export async function initiateMomoPayment(
  env: Env,
  body: InitRequest,
  uid: string,
  idempotencyKey?: string,
): Promise<PaymentInitResult> {
  const phone = normalizeMomoPhone(body.phone);
  const repo = createPaymentRepository(env);
  const quote = await loadCheckoutQuote(repo, body.quoteId, uid, body);
  const resolved = await resolvePayment(env, body, uid, repo, { quote });

  try {
    assertMethodSupportsCurrency("momo", resolved.currency);
  } catch {
    throw new PaymentRequestError(
      "UNSUPPORTED_METHOD",
      `Mobile Money cannot charge ${resolved.currency}. Use card payment instead.`,
    );
  }

  const chargeAmount = Math.round(resolved.totalAmount);
  if (!Number.isFinite(chargeAmount) || chargeAmount < 100) {
    throw new PaymentRequestError(
      "AMOUNT_OUT_OF_RANGE",
      "Minimum Mobile Money payment is 100 RWF",
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

  let providerInitiated = false;

  try {
    let authRes: Response;
    try {
      authRes = await fetch(
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
    } catch (networkErr) {
      await logActivity(env, "error", "payment", "Momo pay: Paypack auth network failure", {
        error: networkErr instanceof Error ? networkErr.message : String(networkErr),
      }).catch(() => {});
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Could not reach Mobile Money provider. Please try again.",
        502,
      );
    }

    if (!authRes.ok) {
      const errText = await authRes.text().catch(() => "");
      console.error("Paypack auth error:", authRes.status, errText);
      await logActivity(env, "error", "payment", "Momo pay: Paypack auth failed", {
        status: authRes.status,
        error: errText.slice(0, 500),
      }).catch(() => {});
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Paypack authentication failed",
        502,
      );
    }

    const authJson = (await authRes.json().catch(() => ({}))) as { access?: string };
    const access = authJson.access;
    if (!access) {
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Paypack authentication did not return an access token",
        502,
      );
    }

    let payRes: Response;
    try {
      payRes = await fetch(
        "https://payments.paypack.rw/api/transactions/cashin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
            "X-Webhook-Mode": "production",
          },
          body: JSON.stringify({ amount: chargeAmount, number: phone }),
        },
      );
    } catch (networkErr) {
      await logActivity(env, "error", "payment", "Momo pay: Paypack cashin network failure", {
        amount: chargeAmount,
        creatorHandle: resolved.creatorHandle,
        error: networkErr instanceof Error ? networkErr.message : String(networkErr),
      }).catch(() => {});
      throw new PaymentRequestError(
        "PROVIDER_INITIATION_FAILED",
        "Could not reach Mobile Money provider to start payment. Please try again.",
        502,
      );
    }

    const payRawText = await payRes.text().catch(() => "");
    let payData: { ref?: string; message?: string; error?: string } = {};
    try {
      payData = JSON.parse(payRawText) as typeof payData;
    } catch {}

    if (!payRes.ok || !payData.ref) {
      const detail = payData.message || payData.error || payRawText || "No ref returned";
      await logActivity(env, "error", "payment", "Momo pay: Initiation failed", {
        amount: chargeAmount,
        creatorHandle: resolved.creatorHandle,
        status: payRes.status,
        error: detail.slice(0, 500),
      }).catch(() => {});
      throw new PaymentRequestError(
        "PROVIDER_INITIATION_FAILED",
        "Payment failed to initiate with Paypack. Check the phone number and try again.",
        502,
      );
    }

    const now = new Date().toISOString();
    const txFields: Record<string, unknown> = {
      ref: payData.ref,
      amount: chargeAmount,
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
      txFields.productId = resolved.productId || "";
      txFields.productPrice = resolved.productPrice ?? 0;
      txFields.productName = resolved.productName || "";
      txFields.quantity = resolved.quantity ?? 1;
      txFields.selectedSize = resolved.selectedSize || "";
      if (resolved.items && resolved.items.length > 0) {
        txFields.items = resolved.items;
      }
      if (resolved.shippingAddress) {
        txFields.shippingAddress = resolved.shippingAddress;
      }
      if (resolved.orderId) {
        txFields.orderId = resolved.orderId;
      }
      txFields.platformFeePayer = resolved.platformFeePayer || "buyer";
      if (resolved.couponId) {
        txFields.couponId = resolved.couponId;
      }
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
      await finishAttempt(env, attempt.key, { ref: payData.ref }).catch(() => {});
      providerInitiated = true;
      throw new PaymentRequestError(
        "TRANSACTION_PERSIST_FAILED",
        `Payment ${payData.ref} was initiated but could not be recorded. Contact support with this reference.`,
        502,
      );
    }

    providerInitiated = true;
    await finishAttempt(env, attempt.key, { ref: payData.ref }).catch(() => {});

    if (resolved.fx) {
      await consumeCheckoutQuote(env, resolved.fx.id, payData.ref).catch(() => {});
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
      `${txTypeLabel} of ${chargeAmount.toLocaleString()} ${resolved.currency} initiated`,
      "/admin/payouts",
    ).catch(() => {});

    return { ref: payData.ref, status: "pending" };
  } catch (error) {
    if (!providerInitiated) {
      await abortAttempt(env, attempt.key, error).catch(() => {});
    }
    throw error;
  }
}
