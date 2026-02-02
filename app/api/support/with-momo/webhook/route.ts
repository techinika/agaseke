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

  // 2. Signature Verification
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { ref, status, client } = payload.data;

  // 3. Find Transaction using Admin Syntax
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

  // 4. Idempotency Check (Don't process twice)
  if (txData.status === "successful") {
    console.log(`Transaction ${ref} already processed.`);
    return NextResponse.json({ received: true, note: "Already processed" });
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const platformShare = totalAmount * 0.1; // 10%
    const creatorShare = totalAmount * 0.9; // 90%

    // 5. Atomic Batch or Sequential Updates using Admin SDK
    const batch = adminDb.batch();

    // Update Transaction Status
    batch.update(txDoc.ref, {
      status: "successful",
      successfulAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log Platform Income
    const platformRef = adminDb.collection("platformIncome").doc();
    batch.set(platformRef, {
      amount: platformShare,
      txRef: ref,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log Creator Income
    const incomeRef = adminDb.collection("creatorIncome").doc();
    batch.set(incomeRef, {
      creatorUid: txData.creatorUid,
      amount: creatorShare,
      txRef: ref,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log Support Relationship
    const supportRef = adminDb.collection("supportedCreators").doc();
    batch.set(supportRef, {
      creatorId: txData.creatorId,
      amount: totalAmount,
      supporterId: txData.supporterId || null,
      supporterPhoneNumber: client,
      txRef: ref,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update Creator Stats
    const creatorRef = adminDb.collection("creators").doc(txData.creatorId);
    batch.update(creatorRef, {
      totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
      totalSupporters: admin.firestore.FieldValue.increment(1),
      pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
    });

    if (txData.supporterId) {
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
