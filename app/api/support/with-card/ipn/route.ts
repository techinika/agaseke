import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { handleStorePayment } from "../../handlers/handleStorePayment";
import { handleBookingPayment } from "../../handlers/handleBookingPayment";
import { handleGatheringPayment } from "../../handlers/handleGatheringPayment";
import { handleSupportPayment } from "../../handlers/handleSupportPayment";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
      await req.json();

    if (OrderNotificationType !== "IPNCHANGE") {
      return NextResponse.json({
        orderNotificationType: OrderNotificationType,
        orderTrackingId: OrderTrackingId,
        orderMerchantReference: OrderMerchantReference,
        status: 200,
      });
    }

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

    const txQuery = await adminDb
      .collection("transactions")
      .where("ref", "==", OrderMerchantReference)
      .limit(1)
      .get();

    if (txQuery.empty) {
      await adminDb.collection("activityLogs").add({
        level: "error",
        category: "payment",
        message: "Card IPN: Transaction not found",
        metadata: { ref: OrderMerchantReference },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    if (txData.status === "successful" || txData.status === "success") {
      return NextResponse.json({ status: 200, message: "Already processed" });
    }

    if (statusData.payment_status_description === "Completed") {
      const totalAmount = Number(txData.amount);
      const txType = txData.type || "support";
      const batch = adminDb.batch();

      batch.update(txDoc.ref, {
        status: "successful",
        pesapal_tracking_id: OrderTrackingId,
        payment_method: statusData.payment_method || "card",
        successfulAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      switch (txType) {
        case "store":
          await handleStorePayment(txData, totalAmount, OrderMerchantReference, batch, "card");
          break;
        case "booking":
          await handleBookingPayment(txData, totalAmount, OrderMerchantReference, batch, "card");
          break;
        case "gathering":
          await handleGatheringPayment(txData, totalAmount, OrderMerchantReference, batch);
          break;
        default:
          await handleSupportPayment(txData, totalAmount, OrderMerchantReference, batch, "card_payment_fee");
          break;
      }

      await batch.commit();
    } else {
      await txDoc.ref.update({
        status: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (error: any) {
    console.error("CRITICAL_IPN_ERROR:", error.message);
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Card IPN: Critical processing error",
      metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
