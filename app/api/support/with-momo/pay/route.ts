import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { amount, phone, creatorId, creatorUid, supporterId } =
      await req.json();

    // 1. Authorize with Paypack
    const authRes = await fetch(
      "https://payments.paypack.rw/api/auth/agents/authorize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.PAYPACK_CLIENT_ID,
          client_secret: process.env.PAYPACK_CLIENT_SECRET,
        }),
      },
    );

    const { access } = await authRes.json();

    // 2. Initiate Cashin
    const payRes = await fetch(
      "https://payments.paypack.rw/api/transactions/cashin",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
          "X-Webhook-Mode":
            process.env.NODE_ENV === "production"
              ? "production"
              : "development",
        },
        body: JSON.stringify({ amount, number: phone }),
      },
    );

    const payData = await payRes.json();

    // 3. Record Transaction using Admin SDK
    if (payData.ref) {
      // Note: We use .collection().add() which is the Admin equivalent of addDoc(collection())
      await adminDb.collection("transactions").add({
        ref: payData.ref,
        amount: Number(amount),
        phone,
        creatorId,
        creatorUid,
        supporterId: supporterId || "anonymous",
        status: "pending",
        type: "support",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ ref: payData.ref });
    }

    return NextResponse.json(
      { error: "Payment failed to initiate" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Payment Initiation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
