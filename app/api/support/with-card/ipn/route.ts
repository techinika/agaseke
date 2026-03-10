import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
      await req.json();

    // Pesapal sends this to check if your endpoint is alive or if status changed
    if (OrderNotificationType !== "IPNCHANGE") {
      return NextResponse.json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference,
        status: 200,
      });
    }

    // 1. Get Auth Token
    const authRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Auth/RequestToken`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
        }),
      },
    );
    const { token } = await authRes.json();

    // 2. Verify Status with Pesapal
    const statusRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    const statusData = await statusRes.json();

    // 3. Locate the transaction in Firestore
    const txQuery = await adminDb
      .collection("transactions")
      .where("ref", "==", OrderMerchantReference)
      .limit(1)
      .get();

    if (txQuery.empty) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    // Prevent double-processing
    if (txData.status === "successful" || txData.status === "success") {
      return NextResponse.json({ status: 200, message: "Already processed" });
    }

    // 4. If Successful, Run Allocation Logic
    if (statusData.payment_status_description === "Completed") {
      const totalAmount = Number(txData.amount);
      const batch = adminDb.batch();

      // Calculate Shares based on Agaseke's logic
      const platformSharePercentage = txData.includeReferral
        ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
        : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);

      const platformShare = totalAmount * platformSharePercentage;
      const creatorShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
      const referralShare =
        totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

      // Update Main Transaction
      batch.update(txDoc.ref, {
        status: "successful",
        pesapal_tracking_id: OrderTrackingId,
        payment_method: statusData.payment_method || "card",
        successfulAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Record Platform Income
      batch.set(adminDb.collection("platformIncome").doc(), {
        amount: platformShare,
        txRef: OrderMerchantReference,
        reason: "card_payment_fee",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Record Creator Income
      batch.set(adminDb.collection("creatorIncome").doc(), {
        creatorUid: txData.creatorUid,
        amount: creatorShare,
        txRef: OrderMerchantReference,
        reason: "support",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update Creator Totals
      const creatorRef = adminDb.collection("creators").doc(txData.creatorId);
      batch.update(creatorRef, {
        totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
        totalSupporters: admin.firestore.FieldValue.increment(1),
        pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
      });

      // Handle Referral Allocation
      if (txData.includeReferral && txData.referralUid) {
        batch.set(adminDb.collection("creatorIncome").doc(), {
          creatorUid: txData.referralUid,
          amount: referralShare,
          txRef: OrderMerchantReference,
          reason: "referral_commission",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.update(adminDb.collection("creators").doc(txData.referralId), {
          totalEarnings: admin.firestore.FieldValue.increment(referralShare),
          pendingPayout: admin.firestore.FieldValue.increment(referralShare),
        });
      }

      // Update Supporter Profile Stats
      if (txData.supporterId && txData.supporterId !== "anonymous") {
        const profileRef = adminDb
          .collection("profiles")
          .doc(txData.supporterId);
        batch.update(profileRef, {
          totalSupport: admin.firestore.FieldValue.increment(totalAmount),
          totalSupportedCreators: admin.firestore.FieldValue.increment(1),
        });
      }

      await batch.commit();
      console.log(`[PESAPAL IPN] Success for ${OrderMerchantReference}`);
    } else if (statusData.payment_status_description === "Failed") {
      await txDoc.ref.update({
        status: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Pesapal MUST receive this specific structure to stop retrying the IPN
    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (error: any) {
    console.error("CRITICAL_IPN_ERROR:", error.message);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
