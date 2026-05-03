import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const config = {
    url: process.env.PESAPAL_URL?.trim(),
    key: process.env.PESAPAL_CONSUMER_KEY?.trim(),
    secret: process.env.PESAPAL_CONSUMER_SECRET?.trim(),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL?.trim(),
  };

  try {
    const body = await req.json();
    const {
      productId,
      quantity,
      buyerId,
      buyerEmail,
      buyerName,
      selectedSize,
      productPrice,
      productName,
      creatorId,
      creatorUid,
      platformFeePayer,
    } = body;

    if (!buyerId) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to purchase." },
        { status: 401 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!creatorId || !creatorUid) {
      return NextResponse.json(
        { error: "Product creator not found" },
        { status: 400 }
      );
    }

    const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;
    const price = Number(productPrice) || 0;
    const feePayer = platformFeePayer || "buyer";
    const qty = Number(quantity) || 1;

    let totalAmount = price * qty;
    let platformFee = 0;
    let creatorEarnings = price * qty;

    if (feePayer === "buyer") {
      platformFee = totalAmount * platformSharePercentage;
      totalAmount = totalAmount + platformFee;
    } else {
      platformFee = totalAmount * platformSharePercentage;
      creatorEarnings = totalAmount - platformFee;
    }

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

    const merchantRef = `AGS-STORE-CARD-${Date.now()}`;

    const ipnPath = `${config.baseUrl}/api/store/pay/with-card/ipn`;

    const ipnRes = await fetch(`${config.url}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: ipnPath,
        ipn_notification_type: "POST",
      }),
    });

    const ipnData = await ipnRes.json();

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
          amount: Number(totalAmount),
          description: `Purchase: ${productName}`,
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment`,
          notification_id: ipnData.ipn_id ?? process.env.PESAPAL_IPN_ID,
          billing_address: {
            email_address: buyerEmail || "",
            first_name: buyerName?.split(" ")[0] || "Buyer",
            last_name: buyerName?.split(" ").slice(1).join(" ") || "Agaseke",
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
          amount: Number(totalAmount),
          productPrice: price,
          quantity: qty,
          platformFee: platformFee,
          creatorEarnings: creatorEarnings,
          platformFeePayer: feePayer,
          creatorUid,
          creatorId,
          buyerId: buyerId,
          buyerEmail: buyerEmail || "",
          buyerName: buyerName || "",
          productId: productId,
          productName: productName || "",
          selectedSize: selectedSize || "",
          status: "pending",
          type: "product",
          paymentMethod: "card",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return NextResponse.json({
        redirect_url: payData.redirect_url,
        merchant_reference: payData.merchant_reference,
      });
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
