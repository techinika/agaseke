import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handleStorePayment(
  txData: any,
  totalAmount: number,
  txRef: string,
  batch: admin.firestore.WriteBatch,
  paymentMethod: "momo" | "card" = "momo",
) {
  const platformFee = Number(txData.platformFee) || 0;
  const creatorEarnings = Number(txData.creatorEarnings) || 0;
  const referralEarnings = Number(txData.referralEarnings) || 0;
  const productId = txData.productId;
  const quantity = Number(txData.quantity) || 1;

  let productData = null;
  if (productId) {
    const productSnap = await adminDb
      .collection("storeProducts")
      .doc(productId)
      .get();
    productData = productSnap.data();
  }

  batch.set(adminDb.collection("platformIncome").doc(), {
    amount: platformFee,
    txRef: txRef,
    reason: "product_sale_platform_fee",
    productId: productId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(adminDb.collection("creatorIncome").doc(), {
    creatorUid: txData.creatorUid,
    amount: creatorEarnings,
    txRef: txRef,
    reason: "product_sale",
    productId: productId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (referralEarnings > 0 && txData.referralUid) {
    batch.set(adminDb.collection("creatorIncome").doc(), {
      creatorUid: txData.referralUid,
      amount: referralEarnings,
      txRef: txRef,
      reason: "referral_commission",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection("creators").doc(txData.referralId), {
      totalEarnings: admin.firestore.FieldValue.increment(referralEarnings),
      pendingPayout: admin.firestore.FieldValue.increment(referralEarnings),
    });
  }

  const orderRef = adminDb.collection("storeOrders").doc();
  batch.set(orderRef, {
    orderId: orderRef.id,
    txRef: txRef,
    buyerId: txData.buyerId,
    buyerName: txData.buyerName || "",
    creatorId: txData.creatorId,
    creatorUid: txData.creatorUid,
    productId: productId,
    productName: txData.productName,
    selectedSize: txData.selectedSize || "",
    quantity: quantity,
    productPrice: txData.productPrice,
    platformFee: platformFee,
    totalAmount: totalAmount,
    platformFeePayer: txData.platformFeePayer || "buyer",
    status: "paid",
    paymentMethod,
    currency: txData.currency || "RWF",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(adminDb.collection("sales").doc(), {
    txRef: txRef,
    buyerId: txData.buyerId,
    buyerName: txData.buyerName || "",
    buyerEmail: txData.buyerEmail || "",
    creatorId: txData.creatorId,
    creatorUid: txData.creatorUid,
    productId: productId,
    productName: txData.productName,
    quantity: quantity,
    productPrice: txData.productPrice,
    totalAmount: totalAmount,
    platformFee: platformFee,
    creatorEarnings: creatorEarnings,
    referralEarnings: referralEarnings,
    referralUid: txData.referralUid || null,
    status: "completed",
    paymentMethod,
    currency: txData.currency || "RWF",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(adminDb.collection("creators").doc(txData.creatorId), {
    totalEarnings: admin.firestore.FieldValue.increment(creatorEarnings),
    pendingPayout: admin.firestore.FieldValue.increment(creatorEarnings),
  });

  if (
    productId &&
    productData?.type === "physical" &&
    productData?.stock !== undefined
  ) {
    batch.update(adminDb.collection("storeProducts").doc(productId), {
      stock: admin.firestore.FieldValue.increment(-quantity),
    });
  }

  if (txData.buyerId) {
    batch.update(adminDb.collection("profiles").doc(txData.buyerId), {
      totalPurchases: admin.firestore.FieldValue.increment(1),
      totalSpent: admin.firestore.FieldValue.increment(totalAmount),
    });
  }

  if (txData.creatorUid) {
    await createNotification({
      userId: txData.creatorUid,
      type: "new_sale",
      title: "New Sale!",
      message: `${txData.buyerName || "Someone"} purchased ${txData.productName || "a product"} for ${totalAmount.toLocaleString()} RWF`,
      metadata: {
        txRef: txRef,
        productId: productId,
        productName: txData.productName,
        buyerName: txData.buyerName,
        buyerEmail: txData.buyerEmail,
        amount: totalAmount,
        creatorEarnings: creatorEarnings,
      },
      link: "/creator/sales",
      actorName: txData.buyerName || undefined,
      actorId: txData.buyerId || undefined,
    });
  }
}