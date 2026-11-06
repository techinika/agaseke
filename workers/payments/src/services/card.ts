import type { Env, InitRequest, PaymentInitResult } from "../types";
import { convertToFields, firestoreSet } from "../firestore";
import { logActivity } from "../logger";
import { notifyAdmins } from "../adminNotifications";
import { PaymentRequestError, resolvePayment } from "./pricing";
import { createPaymentRepository } from "./repository";
import {
  abortAttempt,
  beginIdempotentAttempt,
  buildRetryPayload,
  finishAttempt,
} from "./initiate";

function describePayment(
  type: string,
  creatorHandle: string,
  productName?: string,
): string {
  switch (type) {
    case "store":
      return `Purchase: ${productName || "Store item"}`;
    case "booking":
      return `Booking payment for ${creatorHandle}`;
    case "gathering":
      return `Gathering ticket for ${creatorHandle}`;
    case "community":
      return `Community subscription to ${creatorHandle}`;
    case "gift":
      return `Gift for ${creatorHandle}`;
    default:
      return `Support for ${creatorHandle}`;
  }
}

export async function initiateCardPayment(
  env: Env,
  body: InitRequest,
  uid: string,
  idempotencyKey?: string,
): Promise<PaymentInitResult> {
  const repo = createPaymentRepository(env);
  const resolved = await resolvePayment(env, body, uid, repo);

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

  const email =
    (typeof body.email === "string" && body.email.trim()) ||
    resolved.buyerEmail ||
    resolved.attendeeEmail ||
    "support@agaseke.com";

  try {
    const authRes = await fetch(`${env.PESAPAL_URL}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        consumer_key: env.PESAPAL_CONSUMER_KEY,
        consumer_secret: env.PESAPAL_CONSUMER_SECRET,
      }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      console.error("Pesapal auth error:", authRes.status, errText);
      await logActivity(env, "error", "payment", "Card pay: Pesapal auth failed", {
        status: authRes.status,
        error: errText.slice(0, 500),
      });
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Pesapal authentication failed",
        502,
      );
    }

    const { token } = (await authRes.json()) as { token: string };

    // Unguessable merchant reference; the previous timestamp was predictable.
    const merchantRef = `AGS-CARD-${crypto.randomUUID()}`;

    const ipnRes = await fetch(`${env.PESAPAL_URL}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: `${env.PAYMENTS_WORKER_URL}/api/payments/webhooks/pesapal`,
        ipn_notification_type: "POST",
      }),
    });

    if (!ipnRes.ok) {
      const errText = await ipnRes.text();
      console.error("Pesapal IPN registration error:", ipnRes.status, errText);
      await logActivity(
        env,
        "error",
        "payment",
        "Card pay: IPN registration failed",
        {
          status: ipnRes.status,
          error: errText.slice(0, 500),
        },
      );
      throw new PaymentRequestError(
        "PROVIDER_IPN_FAILED",
        "Card payment setup failed",
        502,
      );
    }

    const ipnData = (await ipnRes.json()) as { ipn_id?: string };

    const payRes = await fetch(
      `${env.PESAPAL_URL}/api/Transactions/SubmitOrderRequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: merchantRef,
          currency: resolved.currency,
          amount: resolved.totalAmount,
          description: describePayment(
            resolved.type,
            resolved.creatorHandle,
            resolved.productName,
          ),
          callback_url: `${env.APP_URL}/payment`,
          notification_id: ipnData.ipn_id ?? env.PESAPAL_IPN_ID,
          billing_address: {
            email_address: email,
            first_name:
              (typeof body.firstName === "string" && body.firstName) ||
              resolved.buyerName ||
              "Supporter",
            last_name:
              (typeof body.lastName === "string" && body.lastName) ||
              "Agaseke",
            country_code: "RW",
          },
        }),
      },
    );

    if (!payRes.ok) {
      const errText = await payRes.text();
      console.error("Pesapal submit order error:", payRes.status, errText);
      await logActivity(
        env,
        "error",
        "payment",
        "Card pay: Order submission failed",
        {
          status: payRes.status,
          error: errText.slice(0, 500),
          merchantRef,
        },
      );
      throw new PaymentRequestError(
        "PROVIDER_INITIATION_FAILED",
        "Card payment could not be initiated",
        502,
      );
    }

    const payData = (await payRes.json()) as {
      redirect_url?: string;
      merchant_reference?: string;
      order_tracking_id?: string;
    };

    if (!payData.redirect_url) {
      await logActivity(env, "error", "payment", "Card pay: No redirect_url", {
        merchantRef,
        amount: resolved.totalAmount,
        creatorHandle: resolved.creatorHandle,
      });
      throw new PaymentRequestError(
        "PROVIDER_INITIATION_FAILED",
        "Card payment could not be initiated",
        502,
      );
    }

    const now = new Date().toISOString();
    const txFields: Record<string, unknown> = {
      ref: merchantRef,
      orderTrackingId: payData.order_tracking_id || "",
      amount: resolved.totalAmount,
      currency: resolved.currency,
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
      paymentMethod: "card",
      paymentProvider: "pesapal",
      providerRef: merchantRef,
      idempotencyKey: attempt.key,
      platformFee: resolved.platformFee,
      creatorEarnings: resolved.creatorEarnings,
      referralEarnings: resolved.referralEarnings,
      processorCost: resolved.processorCost,
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
      txFields.buyerEmail = resolved.buyerEmail || email;
    }

    if (resolved.type === "booking") {
      txFields.bookingId = resolved.bookingId;
      txFields.buyerName = resolved.buyerName || "";
      txFields.buyerEmail = resolved.buyerEmail || email;
    }

    if (resolved.type === "gathering") {
      txFields.gatheringId = resolved.gatheringId;
      txFields.attendeeName = resolved.attendeeName || "";
      txFields.attendeeEmail = resolved.attendeeEmail || email;
      txFields.attendeePhoto = resolved.attendeePhoto || "";
    }

    if (resolved.type === "community") {
      txFields.communityTierId = resolved.communityTierId;
      txFields.communityInterval = resolved.communityInterval || "";
      txFields.communitySubscriptionId =
        resolved.communitySubscriptionId || "";
      txFields.buyerEmail = resolved.buyerEmail || email;
    }

    const doc = await firestoreSet(
      env,
      `transactions/${merchantRef}`,
      convertToFields(txFields),
    );

    if (!doc) {
      await finishAttempt(env, attempt.key, {
        ref: merchantRef,
        redirectUrl: payData.redirect_url,
        merchantReference: merchantRef,
      });
      throw new PaymentRequestError(
        "TRANSACTION_PERSIST_FAILED",
        `Payment ${merchantRef} was initiated but could not be recorded. Contact support with this reference.`,
        502,
      );
    }

    await finishAttempt(env, attempt.key, {
      ref: merchantRef,
      redirectUrl: payData.redirect_url,
      merchantReference: merchantRef,
    });

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

    return {
      redirect_url: payData.redirect_url,
      ref: merchantRef,
      merchant_reference: merchantRef,
      status: "pending",
    };
  } catch (error) {
    await abortAttempt(env, attempt.key, error);
    throw error;
  }
}
