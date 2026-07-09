import type { Env } from "../types";
import { firestoreGet, firestorePost, firestorePatch, extractFirestoreDocument } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

async function incrementField(env: Env, path: string, field: string, amount: number): Promise<void> {
  const doc = await firestoreGet(env, path);
  if (!doc) return;
  const data = extractFirestoreDocument(doc.fields as Record<string, unknown>);
  const current = Number(data[field] || 0);
  await firestorePatch(env, path, {
    [field]: { integerValue: String(Math.round(current + amount)) },
  });
}

export async function handleBookingCallback(
  env: Env,
  body: Record<string, unknown>
): Promise<{ received: boolean }> {
  const { txData, totalAmount, paymentRef, paymentMethod, platformShare, creatorShare, referralShare } = body as {
    txData: Record<string, unknown>;
    totalAmount: number;
    paymentRef: string;
    paymentMethod: "momo" | "card";
    platformShare: number;
    creatorShare: number;
    referralShare: number;
  };

  const currency = (txData.currency as string) || "RWF";
  const isUSD = currency === "USD";
  const payoutField = isUSD ? "pendingPayoutUSD" : "pendingPayout";
  const earningsField = isUSD ? "totalEarningsUSD" : "totalEarnings";

  const bookingId = txData.bookingId as string | undefined;
  if (!bookingId) {
    console.error("Booking callback: No bookingId in txData");
    await logActivity(env, "error", "booking", "Booking callback: No bookingId in txData", { paymentRef });
    return { received: false };
  }

  const now = new Date().toISOString();

  await firestorePost(env, "platformIncome", {
    fields: {
      amount: { integerValue: String(platformShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "booking_fee" },
      createdAt: { timestampValue: now },
    },
  });

  await firestorePost(env, "creatorIncome", {
    fields: {
      creatorUid: { stringValue: txData.creatorUid as string },
      amount: { integerValue: String(creatorShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "booking_payment" },
      createdAt: { timestampValue: now },
    },
  });

  await incrementField(env, `creators/${txData.creatorId}`, earningsField, creatorShare);
  await incrementField(env, `creators/${txData.creatorId}`, payoutField, creatorShare);

  const includeReferral = !!txData.includeReferral;
  if (includeReferral && txData.referralUid && referralShare > 0) {
    await firestorePost(env, "creatorIncome", {
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: { integerValue: String(referralShare) },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    });

    await incrementField(env, `creators/${txData.referralId}`, earningsField, referralShare);
    await incrementField(env, `creators/${txData.referralId}`, payoutField, referralShare);
  }

  await firestorePatch(env, `bookingRequests/${bookingId}`, {
    paymentStatus: { stringValue: "paid" },
    status: { stringValue: "pending" },
    updatedAt: { timestampValue: now },
  });

  const buyerId = (txData.buyerId || txData.supporterId || "") as string;
  if (buyerId && buyerId !== "anonymous") {
    await incrementField(env, `profiles/${buyerId}`, "totalSupport", totalAmount);
    await incrementField(env, `profiles/${buyerId}`, "totalSupportedCreators", 1);
  }

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "booking_paid",
      title: "Booking Payment Received!",
      message: `Booking payment of ${totalAmount.toLocaleString()} RWF received from ${(txData.buyerName as string) || "a client"}`,
      metadata: { txRef: paymentRef, bookingId, amount: totalAmount, creatorShare },
      link: "/creator/bookings",
      actorName: (txData.buyerName as string) || undefined,
      actorId: (txData.buyerId as string) || undefined,
    });
  }

  if (buyerId && buyerId !== "anonymous") {
    await createNotification(env, {
      userId: buyerId,
      type: "booking_paid",
      title: "Payment Confirmed!",
      message: `Your payment of ${totalAmount.toLocaleString()} RWF for booking with ${(txData.creatorName as string) || "creator"} is confirmed.`,
      metadata: { txRef: paymentRef, bookingId, amount: totalAmount },
      link: `/${txData.creatorId as string}/booking`,
      actorName: (txData.creatorName as string) || undefined,
      actorId: (txData.creatorUid as string) || undefined,
    });
  }

  const source = paymentMethod === "momo" ? "MOMO_BOOKING_CALLBACK" : "CARD_BOOKING_CALLBACK";
  await logActivity(env, "info", "booking", `${source}: Booking payment processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    bookingId,
    amount: totalAmount,
    creatorShare,
    paymentMethod,
  });

  return { received: true };
}
