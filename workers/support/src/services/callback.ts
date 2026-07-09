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

  await firestorePost(env, "platformIncome", {
    fields: {
      amount: { integerValue: String(platformShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: paymentMethod === "momo" ? "flat_fee" : "card_payment_fee" },
      createdAt: { timestampValue: now },
    },
  });

  await firestorePost(env, "creatorIncome", {
    fields: {
      creatorUid: { stringValue: txData.creatorUid as string },
      amount: { integerValue: String(creatorShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "support" },
      createdAt: { timestampValue: now },
    },
  });

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

  await incrementField(env, `creators/${txData.creatorId}`, earningsField, creatorShare);
  await incrementField(env, `creators/${txData.creatorId}`, "totalSupporters", 1);
  await incrementField(env, `creators/${txData.creatorId}`, payoutField, creatorShare);

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
    });

    await incrementField(env, `creators/${txData.referralId}`, earningsField, referralShare);
    await incrementField(env, `creators/${txData.referralId}`, payoutField, referralShare);
  }

  if (supporterId && supporterId !== "anonymous") {
    await incrementField(env, `profiles/${supporterId}`, "totalSupport", totalAmount);
    await incrementField(env, `profiles/${supporterId}`, "totalSupportedCreators", 1);
  }

  if (txData.creatorUid) {
    const isAnonymous = !supporterId || supporterId === "anonymous";
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "support_received",
      title: "New Support Received!",
      message: `You received ${totalAmount.toLocaleString()} RWF in support${isAnonymous ? " from an anonymous supporter" : ""}`,
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
