import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const {
      productId,
      quantity,
      buyerId,
      buyerName,
      phone,
      selectedSize,
      productPrice,
      productName,
      creatorId,
      creatorUid,
      platformFeePayer,
    } = await req.json();

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

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
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
        body: JSON.stringify({ amount: Math.round(totalAmount), number: phone }),
      },
    );

    const payData = await payRes.json();

    if (payData.ref) {
      await adminDb.collection("transactions").add({
        ref: payData.ref,
        amount: Math.round(totalAmount),
        productPrice: price,
        quantity: qty,
        platformFee: platformFee,
        creatorEarnings: creatorEarnings,
        platformFeePayer: feePayer,
        phone,
        creatorId,
        creatorUid,
        buyerId: buyerId,
        buyerName: buyerName || "",
        productId: productId,
        productName: productName || "",
        selectedSize: selectedSize || "",
        status: "pending",
        type: "product",
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
