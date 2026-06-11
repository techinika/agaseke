import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handleSupportPayment(
  txData: any,
  totalAmount: number,
  txRef: string,
  batch: admin.firestore.WriteBatch,
  platformFeeReason: string,
  supporterPhoneNumber?: string,
) {
  const platformSharePercentage = txData.includeReferral
    ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
    : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
  const platformShare = totalAmount * platformSharePercentage;
  const creatorShare = totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
  const referralShare = totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

  batch.set(adminDb.collection("platformIncome").doc(), {
    amount: platformShare,
    txRef,
    reason: platformFeeReason,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(adminDb.collection("creatorIncome").doc(), {
    creatorUid: txData.creatorUid,
    amount: creatorShare,
    txRef,
    reason: "support",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const supportedCreatorRef =
    txData.supporterId && txData.supporterId !== "anonymous"
      ? adminDb.collection("supportedCreators").doc(`${txData.supporterId}_${txData.creatorId}`)
      : adminDb.collection("supportedCreators").doc();
  batch.set(supportedCreatorRef, {
    creatorId: txData.creatorId,
    amount: totalAmount,
    supporterId: txData.supporterId || null,
    supporterPhoneNumber: supporterPhoneNumber || null,
    txRef,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(adminDb.collection("creators").doc(txData.creatorId), {
    totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
    totalSupporters: admin.firestore.FieldValue.increment(1),
    pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
  });

  if (txData.includeReferral && txData.referralUid) {
    batch.set(adminDb.collection("creatorIncome").doc(), {
      creatorUid: txData.referralUid,
      amount: referralShare,
      txRef,
      reason: "referral_commission",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection("creators").doc(txData.referralId), {
      totalEarnings: admin.firestore.FieldValue.increment(referralShare),
      pendingPayout: admin.firestore.FieldValue.increment(referralShare),
    });
  }

  if (txData.supporterId && txData.supporterId !== "anonymous") {
    batch.update(adminDb.collection("profiles").doc(txData.supporterId), {
      totalSupport: admin.firestore.FieldValue.increment(totalAmount),
      totalSupportedCreators: admin.firestore.FieldValue.increment(1),
    });
  }

  if (txData.creatorUid) {
    await createNotification({
      userId: txData.creatorUid,
      type: "support_received",
      title: "New Support Received!",
      message: `You received ${totalAmount.toLocaleString()} RWF in support${txData.supporterId && txData.supporterId !== "anonymous" ? "" : " from an anonymous supporter"}`,
      metadata: { txRef, amount: totalAmount, creatorShare },
      link: "/creator/supporters",
      actorId: txData.supporterId !== "anonymous" ? txData.supporterId : undefined,
    });
  }
}