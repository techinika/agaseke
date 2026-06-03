import { NextResponse } from "next/server";
import crypto from "crypto";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { handleStorePayment } from "../../handlers/handleStorePayment";
import { handleBookingPayment } from "../../handlers/handleBookingPayment";
import { handleGatheringPayment } from "../../handlers/handleGatheringPayment";
import { handleSupportPayment } from "../../handlers/handleSupportPayment";

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
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo webhook: Invalid signature",
      metadata: { signature, expectedHash: hash },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
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
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo webhook: Transaction not found",
      metadata: { ref },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Tx not found" }, { status: 404 });
  }

  const txDoc = txQuery.docs[0];
  const txData = txDoc.data();

  if (txData.status === "successful") {
    return NextResponse.json({ received: true, note: "Already processed" });
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const txType = txData.type || "support";
    const batch = adminDb.batch();

    batch.update(txDoc.ref, {
      status: "successful",
      successfulAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    switch (txType) {
      case "store":
        await handleStorePayment(txData, totalAmount, ref, batch, "momo");
        break;
      case "booking":
        await handleBookingPayment(txData, totalAmount, ref, batch, "momo");
        break;
      case "gathering":
        await handleGatheringPayment(txData, totalAmount, ref, batch);
        break;
      default:
        await handleSupportPayment(txData, totalAmount, ref, batch, "flat_fee", client);
        break;
    }

    await batch.commit();
  } else {
    await txDoc.ref.update({ status: "failed" });
  }

  return NextResponse.json({ received: true });
}
