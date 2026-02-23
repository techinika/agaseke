import { NextResponse } from "next/server";
import crypto from "crypto";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paypack-signature");
  const secret = process.env.PAYPACK_WEBHOOK_SECRET!;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { ref, status, client } = payload.data;

  const txQuery = await adminDb
    .collection("transactions")
    .where("ref", "==", ref)
    .limit(1)
    .get();

  if (txQuery.empty) {
    return NextResponse.json({ error: "Tx not found" }, { status: 404 });
  }

  const txDoc = txQuery.docs[0];
  const txData = txDoc.data();

  if (txData.status === "successful") {
    console.log(`Transaction ${ref} already processed.`);
    return NextResponse.json({ received: true, note: "Already processed" });
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const platformSharePercentage = txData.includeReferral
      ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
      : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
    const platformShare = totalAmount * platformSharePercentage;
    const creatorShare =
      totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);

    const referralShare =
      totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

    const batch = adminDb.batch();

    batch.update(txDoc.ref, {
      status: "successful",
      successfulAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const platformRef = adminDb.collection("platformIncome").doc();
    batch.set(platformRef, {
      amount: platformShare,
      txRef: ref,
      reason: "flat_fee",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const incomeRef = adminDb.collection("creatorIncome").doc();
    batch.set(incomeRef, {
      creatorUid: txData.creatorUid,
      amount: creatorShare,
      txRef: ref,
      reason: "support",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const supportRef = adminDb.collection("supportedCreators").doc();
    batch.set(supportRef, {
      creatorId: txData.creatorId,
      amount: totalAmount,
      supporterId: txData.supporterId || null,
      supporterPhoneNumber: client,
      txRef: ref,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const creatorRef = adminDb.collection("creators").doc(txData.creatorId);
    batch.update(creatorRef, {
      totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
      totalSupporters: admin.firestore.FieldValue.increment(1),
      pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
    });

    if (txData.includeReferral) {
      const referralRef = adminDb.collection("creatorIncome").doc();
      batch.set(referralRef, {
        creatorUid: txData.referralUid,
        amount: referralShare,
        txRef: ref,
        reason: "referral_commission",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const referralCreatorRef = adminDb
        .collection("creators")
        .doc(txData.referralId);
      batch.update(referralCreatorRef, {
        totalEarnings: admin.firestore.FieldValue.increment(referralShare),
        pendingPayout: admin.firestore.FieldValue.increment(referralShare),
      });
    }

    if (txData.supporterId && txData.supporterId !== "anonymous") {
      const profileRef = adminDb.collection("profiles").doc(txData.supporterId);
      batch.update(profileRef, {
        totalSupport: admin.firestore.FieldValue.increment(totalAmount),
        totalSupportedCreators: admin.firestore.FieldValue.increment(1),
      });
    }

    await batch.commit();
  } else {
    // Handle Failed Payment
    await txDoc.ref.update({ status: "failed" });
  }

  return NextResponse.json({ received: true });
}
