import type { Env, CardInitRequest } from "../types";
import { convertToFields } from "../firestore";
import { logActivity } from "../logger";
import { notifyAdmins } from "../adminNotifications";
import { calculateRevenue, calculateStoreRevenue } from "../revenue";

export async function initiateCardPayment(
  env: Env,
  body: CardInitRequest,
  uid: string
): Promise<{ redirect_url: string; ref: string; merchant_reference: string }> {
  const {
    amount,
    email,
    firstName,
    lastName,
    creatorId,
    creatorUid,
    supporterId,
    message,
    includeReferral,
    referralUid,
    referralId,
    productId,
    productPrice,
    productName,
    quantity,
    selectedSize,
    platformFeePayer,
    buyerName,
    buyerId,
    bookingId,
    gatheringId,
    attendeeName,
    attendeeEmail,
    attendeePhoto,
    communityTierId,
    communityInterval,
    communitySubscriptionId,
    currency,
  } = body;

  const isStoreTransaction = !!productId;
  const isBookingTransaction = !!bookingId;
  const isGatheringTransaction = !!gatheringId;
  const isCommunityTransaction = !!communityTierId;
  const price = Number(productPrice) || 0;
  const qty = Number(quantity) || 1;
  const feePayer = platformFeePayer || "buyer";

  let totalAmount = Number(amount);
  let platformFee = 0;
  let creatorEarnings = 0;
  let referralEarnings = 0;

  if (isStoreTransaction) {
    const storeRev = calculateStoreRevenue(price * qty, feePayer, env);
    platformFee = storeRev.platformFee;
    referralEarnings = storeRev.referralEarnings;
    totalAmount = storeRev.totalAmount;
    creatorEarnings = storeRev.creatorEarnings;
  }

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
    throw new Error("Pesapal authentication failed");
  }

  const { token } = (await authRes.json()) as { token: string };
  const merchantRef = `AGS-CARD-${Date.now()}`;

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
    await logActivity(env, "error", "payment", "Card pay: IPN registration failed", {
      status: ipnRes.status,
      error: errText.slice(0, 500),
    });
    throw new Error("IPN registration failed");
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
        currency: currency || "RWF",
        amount: totalAmount,
        description: isStoreTransaction
          ? `Purchase: ${productName}`
          : `Support for ${creatorId}`,
        callback_url: `${env.APP_URL}/payment`,
        notification_id: ipnData.ipn_id ?? env.PESAPAL_IPN_ID,
        billing_address: {
          email_address: email,
          first_name: firstName || "Supporter",
          last_name: lastName || "Agaseke",
          country_code: "RW",
        },
      }),
    }
  );

  if (!payRes.ok) {
    const errText = await payRes.text();
    console.error("Pesapal submit order error:", payRes.status, errText);
    await logActivity(env, "error", "payment", "Card pay: Order submission failed", {
      status: payRes.status,
      error: errText.slice(0, 500),
      merchantRef,
    });
    throw new Error("Order submission failed");
  }

  const payData = (await payRes.json()) as {
    redirect_url?: string;
    merchant_reference?: string;
    order_tracking_id?: string;
  };

  if (!payData.redirect_url) {
    await logActivity(env, "error", "payment", "Card pay: No redirect_url", {
      merchantRef,
      amount: totalAmount,
      creatorId,
    });
    throw new Error("Failed to initiate");
  }

  const now = new Date().toISOString();
  const txType = isCommunityTransaction
    ? "community"
    : isGatheringTransaction
      ? "gathering"
      : isBookingTransaction
        ? "booking"
        : isStoreTransaction
          ? "store"
          : "support";

  const txFields: Record<string, unknown> = {
    ref: merchantRef,
    orderTrackingId: payData.order_tracking_id,
    amount: totalAmount,
    creatorUid,
    creatorId,
    buyerId: buyerId || "anonymous",
    supporterId: supporterId || "anonymous",
    status: "pending",
    message: message || "",
    includeReferral: !!includeReferral,
    referralUid: referralUid || "",
    referralId: referralId || "",
    type: txType,
    paymentMethod: "card",
    currency: currency || "RWF",
    createdAt: now,
    initiatedBy: uid,
  };

  if (isStoreTransaction) {
    txFields.productId = productId;
    txFields.productPrice = price;
    txFields.productName = productName || "";
    txFields.quantity = qty;
    txFields.selectedSize = selectedSize || "";
    txFields.platformFee = platformFee;
    txFields.creatorEarnings = creatorEarnings;
    txFields.referralEarnings = referralEarnings;
    txFields.platformFeePayer = feePayer;
    txFields.buyerId = buyerId || supporterId || "anonymous";
    txFields.buyerName = buyerName || "";
    if (email) txFields.buyerEmail = email;
  }

  if (isBookingTransaction) {
    txFields.bookingId = bookingId;
    txFields.buyerId = buyerId || supporterId || "anonymous";
    txFields.buyerName = buyerName || "";
    if (email) txFields.buyerEmail = email;
  }

  if (isGatheringTransaction) {
    txFields.gatheringId = gatheringId;
    txFields.attendeeName = attendeeName || "";
    txFields.attendeeEmail = attendeeEmail || attendeeName || "";
    txFields.attendeePhoto = attendeePhoto || "";
  }

  if (isCommunityTransaction) {
    txFields.communityTierId = communityTierId;
    txFields.communityInterval = communityInterval || "";
    txFields.communitySubscriptionId = communitySubscriptionId || "";
  }

  const { firestoreSet } = await import("../firestore");
  await firestoreSet(env, `transactions/${merchantRef}`, convertToFields(txFields));

  const txTypeLabel = isCommunityTransaction
    ? "Community subscription"
    : isGatheringTransaction
      ? "Gathering ticket"
      : isBookingTransaction
        ? "Booking payment"
        : isStoreTransaction
          ? "Store purchase"
          : "Support";

  await notifyAdmins(
    env,
    "New Transaction",
    `${txTypeLabel} of ${totalAmount.toLocaleString()} ${currency || "RWF"} initiated`,
    "/admin/payouts"
  );

  return {
    redirect_url: payData.redirect_url,
    ref: merchantRef,
    merchant_reference: payData.merchant_reference || "",
  };
}
