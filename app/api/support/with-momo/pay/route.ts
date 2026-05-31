import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";

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
       email,
       buyerEmail,
        bookingId,
        gatheringId,
        attendeeName,
        attendeeEmail,
        attendeePhoto,
       } = await req.json();

    const isStoreTransaction = !!productId;
    const isBookingTransaction = !!bookingId;
    const isGatheringTransaction = !!gatheringId;
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
          creatorEarnings = productTotal - referralEarnings;
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
         includeReferral: !!includeReferral,
         status: "pending",
        message: message ?? "",
        referralUid: referralUid ?? "",
        referralId: referralId ?? "",
        type: isGatheringTransaction ? "gathering" : isBookingTransaction ? "booking" : isStoreTransaction ? "store" : "support",
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
          txData.buyerEmail = buyerEmail || email || "";
        }

        if (isBookingTransaction) {
          txData.bookingId = bookingId;
          txData.buyerId = supporterId || "anonymous";
          txData.buyerName = buyerName || "";
          txData.buyerEmail = buyerEmail || email || "";
        }

        if (isGatheringTransaction) {
          txData.gatheringId = gatheringId;
          txData.attendeeName = attendeeName || "";
          txData.attendeeEmail = attendeeEmail || attendeeName || "";
          txData.attendeePhoto = attendeePhoto || "";
        }

      await adminDb.collection("transactions").add(txData);

      const adminsSnap = await adminDb.collection("profiles").where("isAdmin", "==", true).get();
      for (const adminDoc of adminsSnap.docs) {
        await createNotification({
          userId: adminDoc.id,
          type: "new_transaction",
          title: "New Transaction",
          message: `${isGatheringTransaction ? "Gathering ticket" : isBookingTransaction ? "Booking payment" : isStoreTransaction ? "Store purchase" : "Support"} of ${totalAmount.toLocaleString()} RWF initiated`,
          link: "/admin/payouts",
        });
      }

      return NextResponse.json({ ref: payData.ref });
    }

    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo pay: Payment failed to initiate - no ref returned",
      metadata: { phone, amount: totalAmount, creatorId },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json(
      { error: "Payment failed to initiate" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Payment Initiation Error:", error);
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Momo pay: Payment initiation failed",
      metadata: { error: error.message, stack: error.stack?.slice(0, 2000) || "" },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
