import type { Env } from "../types";
import { firestoreGet, firestorePost, firestorePatch, extractFirestoreDocument } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

async function incrementField(env: Env, path: string, field: string, amount: number): Promise<void> {
  const doc = await firestoreGet(env, path);
  if (!doc) return;
  const data = extractFirestoreDocument(doc.fields as Record<string, unknown>);
  const current = Number(data[field] || 0);
  await firestorePatch(env, path, {
    [field]: { integerValue: String(Math.round(current + amount)) },
  });
}

export async function handleStoreCallback(
  env: Env,
  body: Record<string, unknown>
): Promise<{ received: boolean }> {
  const { txData, totalAmount, paymentRef, paymentMethod, platformShare, creatorShare, referralShare } = body as {
    txData: Record<string, unknown>;
    totalAmount: number;
    paymentRef: string;
    paymentMethod: "momo" | "card";
    platformShare: number;
    creatorShare: number;
    referralShare: number;
  };

  const productId = txData.productId as string | undefined;
  const quantity = Number(txData.quantity) || 1;

  let productData: Record<string, unknown> | null = null;
  if (productId) {
    const productSnap = await firestoreGet(env, `storeProducts/${productId}`);
    if (productSnap) {
      productData = extractFirestoreDocument(productSnap.fields as Record<string, unknown>);
    }
  }

  const now = new Date().toISOString();

  await firestorePost(env, "platformIncome", {
    fields: {
      amount: { integerValue: String(platformShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "product_sale_platform_fee" },
      productId: { stringValue: productId || "" },
      createdAt: { timestampValue: now },
    },
  });

  await firestorePost(env, "creatorIncome", {
    fields: {
      creatorUid: { stringValue: txData.creatorUid as string },
      amount: { integerValue: String(creatorShare) },
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "product_sale" },
      productId: { stringValue: productId || "" },
      createdAt: { timestampValue: now },
    },
  });

  if (referralShare > 0 && txData.referralUid) {
    await firestorePost(env, "creatorIncome", {
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: { integerValue: String(referralShare) },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    });

    await incrementField(env, `creators/${txData.referralId}`, "totalEarnings", referralShare);
    await incrementField(env, `creators/${txData.referralId}`, "pendingPayout", referralShare);
  }

  const orderResult = await firestorePost(env, "storeOrders", {
    fields: {
      txRef: { stringValue: paymentRef },
      buyerId: { stringValue: txData.buyerId as string },
      buyerName: { stringValue: (txData.buyerName as string) || "" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorUid: { stringValue: txData.creatorUid as string },
      productId: { stringValue: productId || "" },
      productName: { stringValue: (txData.productName as string) || "" },
      selectedSize: { stringValue: (txData.selectedSize as string) || "" },
      quantity: { integerValue: String(quantity) },
      productPrice: { integerValue: String(txData.productPrice || 0) },
      platformFee: { integerValue: String(platformShare) },
      totalAmount: { integerValue: String(Math.round(totalAmount)) },
      platformFeePayer: { stringValue: (txData.platformFeePayer as string) || "buyer" },
      status: { stringValue: "paid" },
      paymentMethod: { stringValue: paymentMethod },
      currency: { stringValue: (txData.currency as string) || "RWF" },
      createdAt: { timestampValue: now },
    },
  });

  await firestorePost(env, "sales", {
    fields: {
      txRef: { stringValue: paymentRef },
      buyerId: { stringValue: txData.buyerId as string },
      buyerName: { stringValue: (txData.buyerName as string) || "" },
      buyerEmail: { stringValue: (txData.buyerEmail as string) || "" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorUid: { stringValue: txData.creatorUid as string },
      productId: { stringValue: productId || "" },
      productName: { stringValue: (txData.productName as string) || "" },
      quantity: { integerValue: String(quantity) },
      productPrice: { integerValue: String(txData.productPrice || 0) },
      totalAmount: { integerValue: String(Math.round(totalAmount)) },
      platformFee: { integerValue: String(platformShare) },
      creatorEarnings: { integerValue: String(creatorShare) },
      referralEarnings: { integerValue: String(referralShare) },
      referralUid: { stringValue: (txData.referralUid as string) || "" },
      status: { stringValue: "completed" },
      paymentMethod: { stringValue: paymentMethod },
      currency: { stringValue: (txData.currency as string) || "RWF" },
      createdAt: { timestampValue: now },
    },
  });

  await incrementField(env, `creators/${txData.creatorId}`, "totalEarnings", creatorShare);
  await incrementField(env, `creators/${txData.creatorId}`, "pendingPayout", creatorShare);

  if (
    productId &&
    productData?.type === "physical" &&
    productData?.stock !== undefined
  ) {
    await firestorePatch(env, `storeProducts/${productId}`, {
      stock: { integerValue: String(Math.max(0, Number(productData.stock) - quantity)) },
    });
  }

  const buyerId = txData.buyerId as string | undefined;
  if (buyerId) {
    await incrementField(env, `profiles/${buyerId}`, "totalPurchases", 1);
    await incrementField(env, `profiles/${buyerId}`, "totalSpent", totalAmount);
  }

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "new_sale",
      title: "New Sale!",
      message: `${(txData.buyerName as string) || "Someone"} purchased ${(txData.productName as string) || "a product"} for ${totalAmount.toLocaleString()} RWF`,
      metadata: {
        txRef: paymentRef,
        productId,
        productName: txData.productName,
        buyerName: txData.buyerName,
        amount: totalAmount,
        creatorEarnings: creatorShare,
      },
      link: "/creator/sales",
      actorName: (txData.buyerName as string) || undefined,
      actorId: buyerId || undefined,
    });
  }

  await logActivity(env, "info", "store", `Store purchase processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    productId: productId || "",
    amount: totalAmount,
    creatorShare,
    paymentMethod,
    buyer: buyerId || "anonymous",
  });

  return { received: true };
}
