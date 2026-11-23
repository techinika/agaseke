import type { Env } from "../types";
import {
  firestoreGet,
  firestorePost,
  firestorePatch,
  extractFirestoreDocument,
  firestoreApplyPayment,
} from "../firestore";
import { buildPaymentLedger, isMoneyLedgerEnabled, ledgerMarkerFields } from "../money/ledger";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

function numberValue(value: unknown): Record<string, unknown> {
  const num = Number(value || 0);
  return Number.isInteger(num) ? { integerValue: String(num) } : { doubleValue: num };
}

interface CallbackStoreItem {
  productId: string;
  productName: string;
  productType?: string;
  productPrice: number;
  quantity: number;
  selectedSize?: string;
}

function normalizeCallbackItems(txData: Record<string, unknown>): CallbackStoreItem[] {
  if (Array.isArray(txData.items) && txData.items.length > 0) {
    return txData.items
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
      .map((entry) => ({
        productId: String(entry.productId || ""),
        productName: String(entry.productName || ""),
        productType: typeof entry.productType === "string" ? entry.productType : undefined,
        productPrice: Number(entry.productPrice || 0),
        quantity: Number(entry.quantity) || 1,
        selectedSize: typeof entry.selectedSize === "string" ? entry.selectedSize : "",
      }))
      .filter((item) => Boolean(item.productId));
  }

  const productId = String(txData.productId || "");
  if (!productId) return [];
  return [
    {
      productId,
      productName: String(txData.productName || ""),
      productPrice: Number(txData.productPrice || 0),
      quantity: Number(txData.quantity) || 1,
      selectedSize: typeof txData.selectedSize === "string" ? txData.selectedSize : "",
    },
  ];
}

function toOrderItemsField(items: CallbackStoreItem[], currency: string): Record<string, unknown> {
  return {
    arrayValue: {
      values: items.map((item) => ({
        mapValue: {
          fields: {
            productId: { stringValue: item.productId },
            productName: { stringValue: item.productName },
            quantity: { integerValue: String(item.quantity) },
            price: numberValue(item.productPrice),
            currency: { stringValue: currency },
            ...(item.selectedSize ? { selectedSize: { stringValue: item.selectedSize } } : {}),
          },
        },
      })),
    },
  };
}

function toShippingField(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const addr = raw as Record<string, unknown>;
  const fullName = String(addr.fullName || "");
  const phone = String(addr.phone || "");
  const address = String(addr.address || "");
  const city = String(addr.city || "");
  const country = String(addr.country || "");
  if (!fullName && !phone && !address && !city) return null;
  return {
    mapValue: {
      fields: {
        fullName: { stringValue: fullName },
        phone: { stringValue: phone },
        address: { stringValue: address },
        city: { stringValue: city },
        country: { stringValue: country },
      },
    },
  };
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

  const currency = txData.currency as string;
  if (!currency) {
    throw new Error("Store callback missing currency");
  }
  const payoutField = currency === "RWF" ? "pendingPayout" : `pendingPayout${currency}`;
  const earningsField = currency === "RWF" ? "totalEarnings" : `totalEarnings${currency}`;

  const items = normalizeCallbackItems(txData);
  const productId = items[0]?.productId || (txData.productId as string | undefined);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0) || (Number(txData.quantity) || 1);

  const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
  const productMap = new Map<string, Record<string, unknown>>();
  for (const id of uniqueProductIds) {
    const productSnap = await firestoreGet(env, `storeProducts/${id}`);
    if (productSnap?.fields) {
      productMap.set(id, extractFirestoreDocument(productSnap.fields as Record<string, unknown>));
    }
  }

  const now = new Date().toISOString();
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");
  const includeReferral = referralShare > 0 && !!txData.referralUid;

  const documents: Array<{ path: string; fields: Record<string, unknown> }> = [
    {
      path: `platformIncome/${safeRef}_platform`,
      fields: {
        amount: numberValue(platformShare),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "product_sale_platform_fee" },
        productId: { stringValue: productId || "" },
        createdAt: { timestampValue: now },
      },
    },
    {
      path: `creatorIncome/${safeRef}_creator`,
      fields: {
        creatorUid: { stringValue: txData.creatorUid as string },
        amount: numberValue(creatorShare),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "product_sale" },
        productId: { stringValue: productId || "" },
        createdAt: { timestampValue: now },
      },
    },
  ];

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: { [earningsField]: creatorShare, [payoutField]: creatorShare },
    },
  ];

  if (includeReferral) {
    documents.push({
      path: `creatorIncome/${safeRef}_referral`,
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: numberValue(referralShare),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    });

    increments.push({
      path: `creators/${txData.referralId}`,
      fields: { [earningsField]: referralShare, [payoutField]: referralShare },
    });
  }

  const shippingField = toShippingField(txData.shippingAddress);
  const existingOrderId = typeof txData.orderId === "string" ? txData.orderId.trim() : "";

  if (existingOrderId) {
    const existingOrder = await firestoreGet(env, `storeOrders/${existingOrderId}`);
    if (existingOrder) {
      await firestorePatch(env, `storeOrders/${existingOrderId}`, {
        txRef: { stringValue: paymentRef },
        status: { stringValue: "paid" },
        paymentStatus: { stringValue: "paid" },
        paymentMethod: { stringValue: paymentMethod },
        platformFee: numberValue(platformShare),
        total: numberValue(totalAmount),
        totalAmount: numberValue(totalAmount),
        currency: { stringValue: currency },
        updatedAt: { timestampValue: now },
        ...(shippingField ? { shippingAddress: shippingField } : {}),
      });
    } else {
      await firestorePost(env, "storeOrders", {
        fields: {
          txRef: { stringValue: paymentRef },
          buyerId: { stringValue: (txData.buyerId as string) || "" },
          buyerName: { stringValue: (txData.buyerName as string) || "" },
          buyerEmail: { stringValue: (txData.buyerEmail as string) || "" },
          creatorId: { stringValue: txData.creatorId as string },
          creatorUid: { stringValue: txData.creatorUid as string },
          productId: { stringValue: productId || "" },
          productName: { stringValue: (txData.productName as string) || items[0]?.productName || "" },
          selectedSize: { stringValue: (txData.selectedSize as string) || items[0]?.selectedSize || "" },
          quantity: { integerValue: String(totalQuantity) },
          productPrice: numberValue(txData.productPrice ?? items[0]?.productPrice ?? 0),
          items: toOrderItemsField(items, currency),
          ...(shippingField ? { shippingAddress: shippingField } : {}),
          platformFee: numberValue(platformShare),
          total: numberValue(totalAmount),
          totalAmount: numberValue(totalAmount),
          platformFeePayer: { stringValue: (txData.platformFeePayer as string) || "buyer" },
          status: { stringValue: "paid" },
          paymentMethod: { stringValue: paymentMethod },
          currency: { stringValue: currency },
          createdAt: { timestampValue: now },
          updatedAt: { timestampValue: now },
        },
      });
    }
  } else {
    await firestorePost(env, "storeOrders", {
      fields: {
        txRef: { stringValue: paymentRef },
        buyerId: { stringValue: (txData.buyerId as string) || "" },
        buyerName: { stringValue: (txData.buyerName as string) || "" },
        buyerEmail: { stringValue: (txData.buyerEmail as string) || "" },
        creatorId: { stringValue: txData.creatorId as string },
        creatorUid: { stringValue: txData.creatorUid as string },
        productId: { stringValue: productId || "" },
        productName: { stringValue: (txData.productName as string) || items[0]?.productName || "" },
        selectedSize: { stringValue: (txData.selectedSize as string) || items[0]?.selectedSize || "" },
        quantity: { integerValue: String(totalQuantity) },
        productPrice: numberValue(txData.productPrice ?? items[0]?.productPrice ?? 0),
        items: toOrderItemsField(items, currency),
        ...(shippingField ? { shippingAddress: shippingField } : {}),
        platformFee: numberValue(platformShare),
        total: numberValue(totalAmount),
        totalAmount: numberValue(totalAmount),
        platformFeePayer: { stringValue: (txData.platformFeePayer as string) || "buyer" },
        status: { stringValue: "paid" },
        paymentMethod: { stringValue: paymentMethod },
        currency: { stringValue: currency },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      },
    });
  }

  await firestorePost(env, "sales", {
    fields: {
      txRef: { stringValue: paymentRef },
      buyerId: { stringValue: (txData.buyerId as string) || "" },
      buyerName: { stringValue: (txData.buyerName as string) || "" },
      buyerEmail: { stringValue: (txData.buyerEmail as string) || "" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorUid: { stringValue: txData.creatorUid as string },
      productId: { stringValue: productId || "" },
      productName: { stringValue: (txData.productName as string) || items[0]?.productName || "" },
      quantity: { integerValue: String(totalQuantity) },
      productPrice: numberValue(txData.productPrice ?? items[0]?.productPrice ?? 0),
      items: toOrderItemsField(items, currency),
      totalAmount: numberValue(totalAmount),
      platformFee: numberValue(platformShare),
      creatorEarnings: numberValue(creatorShare),
      referralEarnings: numberValue(referralShare),
      referralUid: { stringValue: (txData.referralUid as string) || "" },
      status: { stringValue: "completed" },
      paymentMethod: { stringValue: paymentMethod },
      currency: { stringValue: currency },
      createdAt: { timestampValue: now },
    },
  });

  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity);
  }
  for (const [id, soldQty] of qtyByProduct.entries()) {
    const pData = productMap.get(id);
    if (pData?.type === "physical" && pData?.stock !== undefined) {
      increments.push({
        path: `storeProducts/${id}`,
        fields: { stock: -soldQty },
      });
    }
  }

  const buyerId = txData.buyerId as string | undefined;
  if (buyerId) {
    increments.push({
      path: `profiles/${buyerId}`,
      fields: { totalPurchases: 1, totalSpent: totalAmount },
    });
  }

  const ledger = isMoneyLedgerEnabled(env)
    ? buildPaymentLedger({
        paymentRef,
        source: "store",
        currency,
        totalAmount,
        creatorUid: txData.creatorUid as string,
        creatorHandle: txData.creatorId as string,
        creatorShare,
        platformShare,
        referralShare: includeReferral ? referralShare : 0,
        referralUid: includeReferral
          ? (txData.referralUid as string)
          : undefined,
        referralHandle: includeReferral
          ? (txData.referralId as string)
          : undefined,
        createdAt: now,
      })
    : undefined;

  const credit = await firestoreApplyPayment(
    env,
    paymentRef,
    increments,
    {
      txRef: { stringValue: paymentRef },
      worker: { stringValue: "store" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorShare: numberValue(creatorShare),
      totalAmount: numberValue(totalAmount),
      currency: { stringValue: currency },
      status: { stringValue: "applied" },
      appliedAt: { timestampValue: now },
      ...(ledger ? ledgerMarkerFields(ledger) : {}),
    },
    { documents, ledger },
  );

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
      link: "/creator/store?tab=sales",
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
