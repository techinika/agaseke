import type { Env, InitRequest, PaymentInitResult } from "../types";
import { convertToFields, firestoreSet } from "../firestore";
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

function describePayment(
  type: string,
  creatorHandle: string,
  productName?: string,
): string {
  const raw = (() => {
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
  })();
  return raw.slice(0, 100);
}

interface PesapalErrorPayload {
  type?: string;
  code?: string;
  message?: string;
}

function formatPesapalError(error: PesapalErrorPayload | undefined, fallback: string): string {
  if (!error) return fallback;
  const msg = typeof error.message === "string" ? error.message.trim() : "";
  const code = typeof error.code === "string" ? error.code.trim() : "";
  if (msg && code) return `${msg} (${code})`;
  return msg || code || fallback;
}

export async function initiateCardPayment(
  env: Env,
  body: InitRequest,
  uid: string,
  idempotencyKey?: string,
): Promise<PaymentInitResult> {
  const repo = createPaymentRepository(env);
  const quote = await loadCheckoutQuote(repo, body.quoteId, uid, body);
  const resolved = await resolvePayment(env, body, uid, repo, { quote });

  try {
    assertMethodSupportsCurrency("card", resolved.currency);
  } catch {
    throw new PaymentRequestError(
      "UNSUPPORTED_METHOD",
      `Bank cards cannot charge ${resolved.currency}.`,
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

  const email =
    (typeof body.email === "string" && body.email.trim()) ||
    resolved.buyerEmail ||
    resolved.attendeeEmail ||
    "support@agaseke.com";

  const pesapalUrl = (env.PESAPAL_URL || "").trim().replace(/\/+$/, "");
  const consumerKey = (env.PESAPAL_CONSUMER_KEY || "").trim();
  const consumerSecret = (env.PESAPAL_CONSUMER_SECRET || "").trim();
  const appUrl = (env.APP_URL || "").trim().replace(/\/+$/, "");
  const paymentsWorkerUrl = (env.PAYMENTS_WORKER_URL || "").trim().replace(/\/+$/, "");
  const fallbackIpnId = (env.PESAPAL_IPN_ID || "").trim();

  if (!pesapalUrl || !consumerKey || !consumerSecret || !appUrl) {
    await logActivity(env, "error", "payment", "Card pay: Pesapal configuration missing", {
      hasUrl: Boolean(pesapalUrl),
      hasKey: Boolean(consumerKey),
      hasSecret: Boolean(consumerSecret),
      hasAppUrl: Boolean(appUrl),
    });
    throw new PaymentRequestError(
      "PROVIDER_CONFIG_ERROR",
      "Card payments are temporarily unavailable",
      502,
    );
  }

  try {
    const authRes = await fetch(`${pesapalUrl}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
    });

    const authRawText = await authRes.text();
    let authData: { token?: string; error?: PesapalErrorPayload; message?: string } = {};
    try {
      authData = JSON.parse(authRawText) as typeof authData;
    } catch {}

    if (!authRes.ok || authData.error || !authData.token) {
      console.error("Pesapal auth error:", authRes.status, authRawText);
      await logActivity(env, "error", "payment", "Card pay: Pesapal auth failed", {
        status: authRes.status,
        error: formatPesapalError(authData.error, authRawText).slice(0, 500),
      });
      throw new PaymentRequestError(
        "PROVIDER_AUTH_FAILED",
        "Pesapal authentication failed",
        502,
      );
    }

    const token = authData.token;

    // Unguessable merchant reference; the previous timestamp was predictable.
    const merchantRef = `AGS-CARD-${crypto.randomUUID()}`;

    let notificationId = "";
    if (paymentsWorkerUrl) {
      try {
        const ipnRes = await fetch(`${pesapalUrl}/api/URLSetup/RegisterIPN`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            url: `${paymentsWorkerUrl}/api/payments/webhooks/pesapal`,
            ipn_notification_type: "POST",
          }),
        });

        const ipnRawText = await ipnRes.text();
        let ipnData: { ipn_id?: string; error?: PesapalErrorPayload } = {};
        try {
          ipnData = JSON.parse(ipnRawText) as typeof ipnData;
        } catch {}

        const registeredId = typeof ipnData.ipn_id === "string" ? ipnData.ipn_id.trim() : "";
        if (ipnRes.ok && !ipnData.error && registeredId) {
          notificationId = registeredId;
        } else {
          console.warn("Pesapal IPN registration did not return an ID:", ipnRes.status, ipnRawText);
        }
      } catch (ipnErr) {
        console.warn("Pesapal IPN registration request failed:", ipnErr);
      }
    }

    if (!notificationId) {
      notificationId = fallbackIpnId;
      if (notificationId) {
        await logActivity(env, "warn", "payment", "Card pay: Falling back to configured PESAPAL_IPN_ID", {
          merchantRef,
        });
      }
    }

    if (!notificationId) {
      await logActivity(
        env,
        "error",
        "payment",
        "Card pay: IPN registration failed and no PESAPAL_IPN_ID fallback",
        { merchantRef },
      );
      throw new PaymentRequestError(
        "PROVIDER_IPN_FAILED",
        "Card payment setup failed",
        502,
      );
    }

    const rawBuyerName =
      (typeof body.buyerName === "string" && body.buyerName.trim()) ||
      resolved.buyerName ||
      "";
    const nameParts = rawBuyerName.split(/\s+/).filter(Boolean);
    const firstName =
      (typeof body.firstName === "string" && body.firstName.trim()) ||
      nameParts[0] ||
      "Supporter";
    const lastName =
      (typeof body.lastName === "string" && body.lastName.trim()) ||
      (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Agaseke");
    const billingPhone =
      (typeof body.phone === "string" && body.phone.trim()) ||
      resolved.shippingAddress?.phone ||
      "";

    const payRes = await fetch(
      `${pesapalUrl}/api/Transactions/SubmitOrderRequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
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
          callback_url: `${appUrl}/payment`,
          notification_id: notificationId,
          billing_address: {
            email_address: email,
            ...(billingPhone ? { phone_number: billingPhone } : {}),
            first_name: firstName,
            last_name: lastName,
            country_code: "RW",
          },
        }),
      },
    );

    const payRawText = await payRes.text();
    let payData: {
      redirect_url?: string;
      merchant_reference?: string;
      order_tracking_id?: string;
      status?: string;
      message?: string;
      error?: PesapalErrorPayload;
    } = {};
    try {
      payData = JSON.parse(payRawText) as typeof payData;
    } catch {}

    if (!payRes.ok || payData.error || !payData.redirect_url) {
      const detail = formatPesapalError(
        payData.error,
        payData.message || payRawText || "Card payment could not be initiated",
      );
      console.error("Pesapal submit order error:", payRes.status, detail);
      await logActivity(
        env,
        "error",
        "payment",
        "Card pay: Order submission failed",
        {
          status: payRes.status,
          error: detail.slice(0, 500),
          merchantRef,
          type: resolved.type,
          amount: resolved.totalAmount,
          currency: resolved.currency,
          creatorHandle: resolved.creatorHandle,
        },
      );
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
      redirectUrl: payData.redirect_url,
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

    if (resolved.fx) {
      await consumeCheckoutQuote(env, resolved.fx.id, merchantRef);
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
