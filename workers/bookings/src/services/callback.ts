import type { Env } from "../types";
import { firestorePatch, firestoreApplyPayment } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { currencyNumberField, roundCurrencyAmount } from "../money/amount";
import { buildPaymentLedger, isMoneyLedgerEnabled, ledgerMarkerFields } from "../money/ledger";

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
  const payoutField = currency === "RWF" ? "pendingPayout" : `pendingPayout${currency}`;
  const earningsField = currency === "RWF" ? "totalEarnings" : `totalEarnings${currency}`;
  const platformAmount = roundCurrencyAmount(platformShare, currency);
  const creatorAmount = roundCurrencyAmount(creatorShare, currency);
  const referralAmount = roundCurrencyAmount(referralShare, currency);
  const creditedTotal = roundCurrencyAmount(totalAmount, currency);

  const bookingId = txData.bookingId as string | undefined;
  if (!bookingId) {
    console.error("Booking callback: No bookingId in txData");
    await logActivity(env, "error", "booking", "Booking callback: No bookingId in txData", { paymentRef });
    return { received: false };
  }

  const now = new Date().toISOString();
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");
  const includeReferral = !!txData.includeReferral;

  const documents: Array<{ path: string; fields: Record<string, unknown> }> = [
    {
      path: `platformIncome/${safeRef}_platform`,
      fields: {
        amount: currencyNumberField(platformAmount, currency),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "booking_fee" },
        createdAt: { timestampValue: now },
      },
    },
    {
      path: `creatorIncome/${safeRef}_creator`,
      fields: {
        creatorUid: { stringValue: txData.creatorUid as string },
        amount: currencyNumberField(creatorAmount, currency),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "booking_payment" },
        createdAt: { timestampValue: now },
      },
    },
  ];

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: { [earningsField]: creatorAmount, [payoutField]: creatorAmount },
    },
  ];

  if (includeReferral && txData.referralUid && referralShare > 0) {
    documents.push({
      path: `creatorIncome/${safeRef}_referral`,
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: currencyNumberField(referralAmount, currency),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    });

    increments.push({
      path: `creators/${txData.referralId}`,
      fields: { [earningsField]: referralAmount, [payoutField]: referralAmount },
    });
  }

  await firestorePatch(env, `bookingRequests/${bookingId}`, {
    paymentStatus: { stringValue: "paid" },
    status: { stringValue: "pending" },
    updatedAt: { timestampValue: now },
  });

  const buyerId = (txData.buyerId || txData.supporterId || "") as string;
  if (buyerId && buyerId !== "anonymous") {
    increments.push({
      path: `profiles/${buyerId}`,
      fields: { totalSupport: creditedTotal, totalSupportedCreators: 1 },
    });
  }

  const ledger = isMoneyLedgerEnabled(env)
    ? buildPaymentLedger({
        paymentRef,
        source: "booking",
        currency,
        totalAmount: creditedTotal,
        creatorUid: txData.creatorUid as string,
        creatorHandle: txData.creatorId as string,
        creatorShare: creatorAmount,
        platformShare: platformAmount,
        referralShare:
          includeReferral && txData.referralUid && referralAmount > 0
            ? referralAmount
            : 0,
        referralUid:
          includeReferral && txData.referralUid
            ? (txData.referralUid as string)
            : undefined,
        referralHandle:
          includeReferral && txData.referralId
            ? (txData.referralId as string)
            : undefined,
        createdAt: now,
      })
    : undefined;

  const credit = await firestoreApplyPayment(
    env,
    paymentRef,
    increments,
    {
      txRef: { stringValue: paymentRef },
      worker: { stringValue: "bookings" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorShare: currencyNumberField(creatorAmount, currency),
      totalAmount: currencyNumberField(creditedTotal, currency),
      currency: { stringValue: currency },
      status: { stringValue: "applied" },
      appliedAt: { timestampValue: now },
      ...(ledger ? ledgerMarkerFields(ledger) : {}),
    },
    { documents, ledger },
  );

  if (credit !== "applied") {
    await logActivity(env, "warn", "booking", `Booking callback ${credit} for ref=${paymentRef}`, {
      txRef: paymentRef,
      bookingId,
      creatorShare,
    });
  }

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "booking_paid",
      title: "Booking Payment Received!",
      message: `Booking payment of ${creditedTotal.toLocaleString()} ${currency} received from ${(txData.buyerName as string) || "a client"}`,
      metadata: { txRef: paymentRef, bookingId, amount: creditedTotal, creatorShare: creatorAmount },
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
      message: `Your payment of ${creditedTotal.toLocaleString()} ${currency} for booking with ${(txData.creatorName as string) || "creator"} is confirmed.`,
      metadata: { txRef: paymentRef, bookingId, amount: creditedTotal },
      link: `/${txData.creatorId as string}/booking`,
      actorName: (txData.creatorName as string) || undefined,
      actorId: (txData.creatorUid as string) || undefined,
    });
  }

  const source = paymentMethod === "momo" ? "MOMO_BOOKING_CALLBACK" : "CARD_BOOKING_CALLBACK";
  await logActivity(env, "info", "booking", `${source}: Booking payment processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    bookingId,
    amount: creditedTotal,
    creatorShare: creatorAmount,
    paymentMethod,
  });

  return { received: true };
}
