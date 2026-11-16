import type { Env } from "../types";
import { firestorePost, firestorePatch, firestoreApplyPayment } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { currencyNumberField, roundCurrencyAmount } from "../money/amount";
import { buildPaymentLedger, isMoneyLedgerEnabled, ledgerMarkerFields } from "../money/ledger";

export async function handleSupportCallback(
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

  const now = new Date().toISOString();
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");
  const includeReferral = !!txData.includeReferral;

  const documents: Array<{ path: string; fields: Record<string, unknown> }> = [
    {
      path: `platformIncome/${safeRef}_platform`,
      fields: {
        amount: currencyNumberField(platformAmount, currency),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: paymentMethod === "momo" ? "flat_fee" : "card_payment_fee" },
        createdAt: { timestampValue: now },
      },
    },
    {
      path: `creatorIncome/${safeRef}_creator`,
      fields: {
        creatorUid: { stringValue: txData.creatorUid as string },
        amount: currencyNumberField(creatorAmount, currency),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "support" },
        createdAt: { timestampValue: now },
      },
    },
  ];

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: {
        [earningsField]: creatorAmount,
        totalSupporters: 1,
        [payoutField]: creatorAmount,
      },
    },
  ];

  const supporterId = txData.supporterId as string | undefined;
  const supportedCreatorId = supporterId && supporterId !== "anonymous"
    ? `${supporterId}_${txData.creatorId}`
    : undefined;

  if (supportedCreatorId) {
    await firestorePatch(env, `supportedCreators/${supportedCreatorId}`, {
      creatorId: { stringValue: txData.creatorId as string },
      amount: currencyNumberField(creditedTotal, currency),
      supporterId: { stringValue: supporterId },
      supporterPhoneNumber: { stringValue: (txData.phone as string) || "" },
      txRef: { stringValue: paymentRef },
      currency: { stringValue: (txData.currency as string) || "RWF" },
      createdAt: { timestampValue: now },
    });
  } else {
    await firestorePost(env, "supportedCreators", {
      fields: {
        creatorId: { stringValue: txData.creatorId as string },
        amount: currencyNumberField(creditedTotal, currency),
        supporterId: { nullValue: null },
        supporterPhoneNumber: { stringValue: (txData.phone as string) || "" },
        txRef: { stringValue: paymentRef },
        currency: { stringValue: (txData.currency as string) || "RWF" },
        createdAt: { timestampValue: now },
      },
    });
  }

  if (supporterId && supporterId !== "anonymous") {
    await firestorePatch(env, `creators/${txData.creatorId}`, {
      [`supporterUids.${supporterId}`]: { booleanValue: true },
    });
  }

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

  if (supporterId && supporterId !== "anonymous") {
    increments.push({
      path: `profiles/${supporterId}`,
      fields: { totalSupport: creditedTotal, totalSupportedCreators: 1 },
    });
  }

  const ledger = isMoneyLedgerEnabled(env)
    ? buildPaymentLedger({
        paymentRef,
        source: "support",
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
      worker: { stringValue: "support" },
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
    await logActivity(env, "warn", "support", `Support callback ${credit} for ref=${paymentRef}`, {
      txRef: paymentRef,
      creatorId: txData.creatorId,
      creatorShare,
    });
  }


  if (txData.creatorUid) {
    const isAnonymous = !supporterId || supporterId === "anonymous";
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "support_received",
      title: "New Support Received!",
      message: `You received ${creditedTotal.toLocaleString()} ${currency} in support${isAnonymous ? " from an anonymous supporter" : ""}`,
      metadata: { txRef: paymentRef, amount: creditedTotal, creatorShare: creatorAmount },
      link: "/creator/supporters",
      actorId: isAnonymous ? undefined : supporterId,
    });
  }

  await logActivity(env, "info", "support", `Support payment processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    amount: creditedTotal,
    creatorShare: creatorAmount,
    paymentMethod,
    supporter: supporterId || "anonymous",
  });

  return { received: true };
}
