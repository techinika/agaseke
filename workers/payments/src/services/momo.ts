import type { Env, MomoInitRequest } from "../types";
import { convertToFields } from "../firestore";
import { logActivity } from "../logger";
import { notifyAdmins } from "../adminNotifications";
import { calculateRevenue, calculateStoreRevenue } from "../revenue";

export async function initiateMomoPayment(
  env: Env,
  body: MomoInitRequest,
  uid: string
): Promise<{ ref: string }> {
  if (!body.phone) {
    throw new Error("Phone number is required for MoMo payments");
  }

  const {
    amount,
    phone,
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
    email,
    buyerEmail,
    bookingId,
    gatheringId,
    attendeeName,
    attendeeEmail,
    attendeePhoto,
    currency,
  } = body;

  const isStoreTransaction = !!productId;
  const isBookingTransaction = !!bookingId;
  const isGatheringTransaction = !!gatheringId;
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
    }
  );

  if (!authRes.ok) {
    const errText = await authRes.text();
    console.error("Paypack auth error:", authRes.status, errText);
    await logActivity(env, "error", "payment", "Momo pay: Paypack auth failed", {
      status: authRes.status,
      error: errText.slice(0, 500),
    });
    throw new Error("Paypack authentication failed");
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
      body: JSON.stringify({ amount: totalAmount, number: phone }),
    }
  );

  const payData = (await payRes.json()) as { ref?: string };

  if (!payData.ref) {
    await logActivity(env, "error", "payment", "Momo pay: No ref returned", {
      phone,
      amount: totalAmount,
      creatorId,
    });
    throw new Error("Payment failed to initiate");
  }

  const now = new Date().toISOString();
  const txType = isGatheringTransaction
    ? "gathering"
    : isBookingTransaction
      ? "booking"
      : isStoreTransaction
        ? "store"
        : "support";

  const txFields: Record<string, unknown> = {
    ref: payData.ref,
    amount: totalAmount,
    phone,
    creatorId,
    creatorUid,
    supporterId: supporterId || "anonymous",
    includeReferral: !!includeReferral,
    status: "pending",
    message: message ?? "",
    referralUid: referralUid ?? "",
    referralId: referralId ?? "",
    type: txType,
    currency: currency || "RWF",
    paymentMethod: "momo",
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
    txFields.buyerId = supporterId || "anonymous";
    txFields.buyerName = buyerName || "";
    txFields.buyerEmail = buyerEmail || email || "";
  }

  if (isBookingTransaction) {
    txFields.bookingId = bookingId;
    txFields.buyerId = supporterId || "anonymous";
    txFields.buyerName = buyerName || "";
    txFields.buyerEmail = buyerEmail || email || "";
  }

  if (isGatheringTransaction) {
    txFields.gatheringId = gatheringId;
    txFields.attendeeName = attendeeName || "";
    txFields.attendeeEmail = attendeeEmail || attendeeName || "";
    txFields.attendeePhoto = attendeePhoto || "";
  }

  const { firestorePost } = await import("../firestore");
  const doc = await firestorePost(env, "transactions", {
    fields: convertToFields(txFields),
  });

  if (!doc) {
    console.error("Failed to store transaction in Firestore");
  }

  const txTypeLabel = isGatheringTransaction
    ? "Gathering ticket"
    : isBookingTransaction
      ? "Booking payment"
      : isStoreTransaction
        ? "Store purchase"
        : "Support";

  await notifyAdmins(
    env,
    "New Transaction",
    `${txTypeLabel} of ${totalAmount.toLocaleString()} RWF initiated`,
    "/admin/payouts"
  );

  return { ref: payData.ref };
}
