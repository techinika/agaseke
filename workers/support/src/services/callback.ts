import type { Env } from "../types";
import { firestorePost, firestorePatch, firestoreApplyPayment } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

function numberField(value: number): Record<string, unknown> {
  return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
}

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
  const isUSD = currency === "USD";
  const payoutField = isUSD ? "pendingPayoutUSD" : "pendingPayout";
  const earningsField = isUSD ? "totalEarningsUSD" : "totalEarnings";

  const now = new Date().toISOString();
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: {
        [earningsField]: creatorShare,
        totalSupporters: 1,
        [payoutField]: creatorShare,
      },
    },
  ];

  await firestorePost(env, "platformIncome", {
    fields: {
      amount: { integerValue: String(platformShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: paymentMethod === "momo" ? "flat_fee" : "card_payment_fee" },
      createdAt: { timestampValue: now },
    },
  }, `${safeRef}_platform`);

  await firestorePost(env, "creatorIncome", {
    fields: {
      creatorUid: { stringValue: txData.creatorUid as string },
      amount: { integerValue: String(creatorShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "support" },
      createdAt: { timestampValue: now },
    },
  }, `${safeRef}_creator`);

  const supporterId = txData.supporterId as string | undefined;
  const supportedCreatorId = supporterId && supporterId !== "anonymous"
    ? `${supporterId}_${txData.creatorId}`
    : undefined;

  if (supportedCreatorId) {
    await firestorePatch(env, `supportedCreators/${supportedCreatorId}`, {
      creatorId: { stringValue: txData.creatorId as string },
      amount: { integerValue: String(Math.round(totalAmount)) },
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
        amount: { integerValue: String(Math.round(totalAmount)) },
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
    }, `${safeRef}_referral`);

    increments.push({
      path: `creators/${txData.referralId}`,
      fields: { [earningsField]: referralShare, [payoutField]: referralShare },
    });
  }

  if (supporterId && supporterId !== "anonymous") {
    increments.push({
      path: `profiles/${supporterId}`,
      fields: { totalSupport: totalAmount, totalSupportedCreators: 1 },
    });
  }

  const credit = await firestoreApplyPayment(env, paymentRef, increments, {
    txRef: { stringValue: paymentRef },
    worker: { stringValue: "support" },
    creatorId: { stringValue: txData.creatorId as string },
    creatorShare: numberField(creatorShare),
    totalAmount: numberField(totalAmount),
    currency: { stringValue: currency },
    status: { stringValue: "applied" },
    appliedAt: { timestampValue: now },
  });

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
      message: `You received ${totalAmount.toLocaleString()} ${currency} in support${isAnonymous ? " from an anonymous supporter" : ""}`,
      metadata: { txRef: paymentRef, amount: totalAmount, creatorShare },
      link: "/creator/supporters",
      actorId: isAnonymous ? undefined : supporterId,
    });
  }

  await logActivity(env, "info", "support", `Support payment processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    amount: totalAmount,
    creatorShare,
    paymentMethod,
    supporter: supporterId || "anonymous",
  });

  return { received: true };
}
