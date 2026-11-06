import type { Env } from "../types";
import { firestoreGet, firestorePost, extractFirestoreDocument, firestoreApplyPayment } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

function numberValue(value: unknown): Record<string, unknown> {
  const num = Number(value || 0);
  return Number.isInteger(num) ? { integerValue: String(num) } : { doubleValue: num };
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

  const currency = (txData.currency as string) || "RWF";
  const isUSD = currency === "USD";
  const payoutField = isUSD ? "pendingPayoutUSD" : "pendingPayout";
  const earningsField = isUSD ? "totalEarningsUSD" : "totalEarnings";

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
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: { [earningsField]: creatorShare, [payoutField]: creatorShare },
    },
  ];

  await firestorePost(env, "platformIncome", {
    fields: {
      amount: numberValue(platformShare),
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "product_sale_platform_fee" },
      productId: { stringValue: productId || "" },
      createdAt: { timestampValue: now },
    },
  }, `${safeRef}_platform`);

  await firestorePost(env, "creatorIncome", {
    fields: {
      creatorUid: { stringValue: txData.creatorUid as string },
      amount: numberValue(creatorShare),
      txRef: { stringValue: paymentRef },
      reason: { stringValue: "product_sale" },
      productId: { stringValue: productId || "" },
      createdAt: { timestampValue: now },
    },
  }, `${safeRef}_creator`);

  if (referralShare > 0 && txData.referralUid) {
    await firestorePost(env, "creatorIncome", {
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: numberValue(referralShare),
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    }, `${safeRef}_referral`);

    increments.push({
      path: `creators/${txData.referralId}`,
      fields: { [earningsField]: referralShare, [payoutField]: referralShare },
    });
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
      productPrice: numberValue(txData.productPrice),
      platformFee: numberValue(platformShare),
      totalAmount: numberValue(totalAmount),
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
      productPrice: numberValue(txData.productPrice),
      totalAmount: numberValue(totalAmount),
      platformFee: numberValue(platformShare),
      creatorEarnings: numberValue(creatorShare),
      referralEarnings: numberValue(referralShare),
      referralUid: { stringValue: (txData.referralUid as string) || "" },
      status: { stringValue: "completed" },
      paymentMethod: { stringValue: paymentMethod },
      currency: { stringValue: (txData.currency as string) || "RWF" },
      createdAt: { timestampValue: now },
    },
  });

  if (
    productId &&
    productData?.type === "physical" &&
    productData?.stock !== undefined
  ) {
    increments.push({
      path: `storeProducts/${productId}`,
      fields: { stock: -quantity },
    });
  }

  const buyerId = txData.buyerId as string | undefined;
  if (buyerId) {
    increments.push({
      path: `profiles/${buyerId}`,
      fields: { totalPurchases: 1, totalSpent: totalAmount },
    });
  }

  const credit = await firestoreApplyPayment(env, paymentRef, increments, {
    txRef: { stringValue: paymentRef },
    worker: { stringValue: "store" },
    creatorId: { stringValue: txData.creatorId as string },
    creatorShare: numberValue(creatorShare),
    totalAmount: numberValue(totalAmount),
    currency: { stringValue: currency },
    status: { stringValue: "applied" },
    appliedAt: { timestampValue: now },
  });

  if (credit !== "applied") {
    await logActivity(env, "warn", "store", `Store callback ${credit} for ref=${paymentRef}`, {
      txRef: paymentRef,
      productId: productId || "",
      creatorShare,
    });
  }

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "new_sale",
      title: "New Sale!",
      message: `${(txData.buyerName as string) || "Someone"} purchased ${(txData.productName as string) || "a product"} for ${totalAmount.toLocaleString()} ${currency}`,
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
