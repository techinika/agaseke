import { NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } =
      await req.json();

    if (OrderNotificationType !== "IPNCHANGE")
      return NextResponse.json({ ok: true });

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
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const statusData = await statusRes.json();

    // 3. If Successful, Update Firestore
    if (statusData.payment_status_description === "Completed") {
      const txRef = adminDb
        .collection("transactions")
        .doc(OrderMerchantReference);
      const txSnap = await txRef.get();

      if (txSnap.exists && txSnap.data()?.status === "pending") {
        await txRef.update({ status: "success", updatedAt: new Date() });
        // Add your logic here to increment creator income
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "IPN Error" }, { status: 500 });
  }
}
