import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,
      email,
      firstName,
      lastName,
      creatorId,
      creatorUid,
      supporterId,
      message,
      includeReferral,
      referralUid,
      referralId,
    } = body;

    // 1. Get Token
    const authRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Auth/RequestToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
        }),
      },
    );
    const { token } = await authRes.json();

    const merchantRef = `AGS-CARD-${Date.now()}`;

    // 2. Submit Order
    const payRes = await fetch(
      `${process.env.PESAPAL_URL}/api/Transactions/SubmitOrderRequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: merchantRef,
          currency: "RWF",
          amount: Number(amount),
          description: `Support for ${creatorId}`,
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-callback`,
          notification_id: process.env.PESAPAL_IPN_ID,
          billing_address: {
            email_address: email,
            first_name: firstName || "Supporter",
            last_name: lastName || "Agaseke",
            country_code: "RW",
          },
        }),
      },
    );

    const payData = await payRes.json();

    console.log(payData);

    if (payData.redirect_url) {
      await adminDb
        .collection("transactions")
        .doc(merchantRef)
        .set({
          ref: merchantRef,
          orderTrackingId: payData.order_tracking_id,
          amount: Number(amount),
          creatorUid,
          creatorId,
          supporterId: supporterId || "anonymous",
          status: "pending",
          message: message || "",
          includeReferral: !!includeReferral,
          referralUid: referralUid || "",
          referralId: referralId || "",
          type: "support",
          paymentMethod: "card",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return NextResponse.json({ redirect_url: payData.redirect_url });
    }
    return NextResponse.json({ error: "Failed to initiate" }, { status: 400 });
  } catch (error: any) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
