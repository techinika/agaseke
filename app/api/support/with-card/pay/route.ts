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
      productId,
      productPrice,
      productName,
      quantity,
      selectedSize,
      platformFeePayer,
      buyerName,
    } = body;

    const isStoreTransaction = !!productId;
    const platformSharePercentage = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.15;
    const price = Number(productPrice) || 0;
    const qty = Number(quantity) || 1;
    const feePayer = platformFeePayer || "buyer";

    let totalAmount = Number(amount);
    let platformFee = 0;
    let creatorEarnings = 0;
    let referralEarnings = 0;

    if (isStoreTransaction) {
      const productTotal = price * qty;
      platformFee = productTotal * platformSharePercentage;
      referralEarnings = productTotal * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);
      
      if (feePayer === "buyer") {
        totalAmount = productTotal + platformFee;
        creatorEarnings = productTotal - platformFee - referralEarnings;
      } else {
        creatorEarnings = productTotal - platformFee - referralEarnings;
      }
    }

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

    const ipnPath = `${config.baseUrl}/api/support/with-card/ipn`;

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
          amount: totalAmount,
          description: isStoreTransaction ? `Purchase: ${productName}` : `Support for ${creatorId}`,
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment`,
          notification_id: ipnData.ipn_id ?? process.env.PESAPAL_IPN_ID,
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
      const txData: Record<string, any> = {
        ref: merchantRef,
        orderTrackingId: payData.order_tracking_id,
        amount: totalAmount,
        creatorUid,
        creatorId,
        supporterId: supporterId || "anonymous",
        status: "pending",
        message: message || "",
        includeReferral: !!includeReferral,
        referralUid: referralUid || "",
        referralId: referralId || "",
        type: isStoreTransaction ? "store" : "support",
        paymentMethod: "card",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isStoreTransaction) {
        txData.productId = productId;
        txData.productPrice = price;
        txData.productName = productName || "";
        txData.quantity = qty;
        txData.selectedSize = selectedSize || "";
        txData.platformFee = platformFee;
        txData.creatorEarnings = creatorEarnings;
        txData.referralEarnings = referralEarnings;
        txData.platformFeePayer = feePayer;
        txData.buyerId = supporterId || "anonymous";
        txData.buyerName = buyerName || "";
        if (email) txData.buyerEmail = email;
      }

      await adminDb
        .collection("transactions")
        .doc(merchantRef)
        .set(txData);

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
