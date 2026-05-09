import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const {
      amount,
      phone,
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
    } = await req.json();

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

       totalAmount = productTotal;

       if (feePayer === "buyer") {
         totalAmount = productTotal + platformFee;
         creatorEarnings = productTotal - platformFee - referralEarnings;
       } else {
         creatorEarnings = productTotal - platformFee - referralEarnings;
       }
     }

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
         body: JSON.stringify({ amount: totalAmount, number: phone }),
       },
     );

    const payData = await payRes.json();

    if (payData.ref) {
      const txData: Record<string, any> = {
        ref: payData.ref,
        amount: totalAmount,
        phone,
        creatorId,
        creatorUid,
        supporterId: supporterId || "anonymous",
        includeReferral: includeReferral,
        status: "pending",
        message: message ?? "",
        referralUid: referralUid ?? "",
        referralId: referralId ?? "",
        type: isStoreTransaction ? "store" : "support",
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
      }

      await adminDb.collection("transactions").add(txData);

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
