import type { Env, PesapalIPNPayload } from "../types";
import { firestoreQuery, firestoreSet, firestoreIncrement, firestorePost, convertFromFields, convertToFields } from "../firestore";
import { logActivity } from "../logger";
import { createNotification, notifyAdmins } from "../adminNotifications";

async function verifyHmacSha256(
  body: string,
  secret: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const uint8 = new Uint8Array(signatureBytes);
    const binary = Array.from(uint8).map((b) => String.fromCharCode(b)).join("");
    const computed = btoa(binary);
    return computed === signature;
  } catch (err) {
    console.error("HMAC verification error:", err);
    return false;
  }
}

function extractDocId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

function getCallbackUrl(txType: string, env: Env): string {
  switch (txType) {
    case "store":
      return `${env.STORE_WORKER_URL}/api/store/callback`;
    case "booking":
      return `${env.BOOKINGS_WORKER_URL}/api/bookings/callback`;
    case "community":
      return `${env.COMMUNITY_WORKER_URL}/api/community/callback`;
    case "gathering":
      return "";
    default:
      return `${env.SUPPORT_WORKER_URL}/api/support/callback`;
  }
}

async function forwardToDomainWorker(
  env: Env,
  callbackUrl: string,
  txData: Record<string, unknown>,
  totalAmount: number,
  paymentRef: string,
  paymentMethod: "momo" | "card"
): Promise<void> {
  const includeReferral = !!txData.includeReferral;
  const platformSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL || 0.15)
    : Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.15);
  const creatorSharePercentage = Number(env.NEXT_PUBLIC_CREATOR_SHARE || 0.80);
  const referralSharePercentage = Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);

  const isStore = txData.type === "store";
  const platformShare = isStore
    ? Number(txData.platformFee || 0)
    : totalAmount * platformSharePercentage;
  const creatorShare = isStore
    ? Number(txData.creatorEarnings || 0)
    : totalAmount * creatorSharePercentage;
  const referralShare = isStore
    ? Number(txData.referralEarnings || 0)
    : totalAmount * referralSharePercentage;

  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": env.INTERNAL_AUTH_SECRET,
      },
      body: JSON.stringify({
        txData,
        totalAmount,
        paymentRef,
        paymentMethod,
        platformShare: Math.round(platformShare),
        creatorShare: Math.round(creatorShare),
        referralShare: Math.round(referralShare),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Callback to ${callbackUrl} failed: ${res.status} ${errText}`);
      await logActivity(env, "error", "payment", `Callback to domain worker failed`, {
        callbackUrl,
        status: res.status,
        error: errText.slice(0, 500),
        paymentRef,
      });
    }
  } catch (err) {
    console.error(`Callback to ${callbackUrl} error:`, err);
    await logActivity(env, "error", "payment", `Callback to domain worker error`, {
      callbackUrl,
      error: String(err),
      paymentRef,
    });
  }
}

async function handleGatheringPayment(
  env: Env,
  txData: Record<string, unknown>,
  totalAmount: number,
  txRef: string
): Promise<void> {
  const includeReferral = !!txData.includeReferral;
  const platformSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL || 0.15)
    : Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.15);
  const creatorSharePercentage = Number(env.NEXT_PUBLIC_CREATOR_SHARE || 0.80);
  const referralSharePercentage = Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);

  const platformShare = totalAmount * platformSharePercentage;
  const creatorShare = totalAmount * creatorSharePercentage;
  const referralShare = totalAmount * referralSharePercentage;

  const now = new Date().toISOString();

  await firestorePost(env, "platformIncome", {
    fields: convertToFields({
      amount: Math.round(platformShare),
      txRef,
      reason: "gathering_ticket",
      createdAt: now,
    }),
  });

  await firestorePost(env, "creatorIncome", {
    fields: convertToFields({
      creatorUid: txData.creatorUid,
      amount: Math.round(creatorShare),
      txRef,
      reason: "gathering_ticket",
      createdAt: now,
    }),
  });

  await firestoreIncrement(env, `creators/${txData.creatorId}`, {
    totalEarnings: Math.round(creatorShare),
    pendingPayout: Math.round(creatorShare),
  });

  if (includeReferral && txData.referralUid) {
    await firestorePost(env, "creatorIncome", {
      fields: convertToFields({
        creatorUid: txData.referralUid,
        amount: Math.round(referralShare),
        txRef,
        reason: "referral_commission",
        createdAt: now,
      }),
    });

    await firestoreIncrement(env, `creators/${txData.referralId}`, {
      totalEarnings: Math.round(referralShare),
      pendingPayout: Math.round(referralShare),
    });
  }

  await firestorePost(env, "gatheringsAttendance", {
    fields: convertToFields({
      gatheringId: txData.gatheringId,
      supporterId: (txData.supporterId as string) || "anonymous",
      supporterName: (txData.attendeeName as string) || "Anonymous",
      supporterEmail: (txData.attendeeEmail as string) || "",
      supporterPhoto: (txData.attendeePhoto as string) || "",
      creatorHandle: txData.creatorId,
      paid: true,
      amount: totalAmount,
      paymentRef: txRef,
      checkedIn: false,
      createdAt: now,
    }),
  });

  await firestorePost(env, "ticketSales", {
    fields: convertToFields({
      creatorHandle: txData.creatorId,
      buyerId: (txData.supporterId as string) || "anonymous",
      transactionId: txRef,
      gatheringId: txData.gatheringId,
      ticketAmount: totalAmount,
      createdAt: now,
    }),
  });

  await firestoreIncrement(env, `creatorGatherings/${txData.gatheringId}`, {
    attendeesCount: 1,
  });

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "new_gathering",
      title: "New Ticket Sale!",
      message: `${(txData.attendeeName as string) || "Someone"} purchased a ticket for your gathering`,
      metadata: {
        txRef,
        gatheringId: txData.gatheringId,
        amount: totalAmount,
        creatorShare,
      },
      link: "/creator/gatherings",
      actorName: (txData.attendeeName as string) || undefined,
    });
  }

  await notifyAdmins(
    env,
    "Ticket Sale",
    `Ticket sale of ${totalAmount.toLocaleString()} RWF from ${(txData.attendeeName as string) || "someone"}`,
    "/admin/transactions"
  );
}

export async function handlePaypackWebhook(
  env: Env,
  body: string,
  signature: string | null
): Promise<{ received: boolean }> {
  const valid = await verifyHmacSha256(body, env.PAYPACK_WEBHOOK_SECRET, signature);
  if (!valid) {
    await logActivity(env, "error", "payment", "Momo webhook: Invalid signature", {
      signature,
    });
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(body);
  const { ref, status, client } = payload.data;

  const docs = await firestoreQuery(env, "transactions", "ref", { stringValue: ref });
  if (docs.length === 0) {
    await logActivity(env, "error", "payment", "Momo webhook: Transaction not found", { ref });
    throw new Error("Transaction not found");
  }

  const doc = docs[0];
  const docId = extractDocId(doc.name);
  const txData = convertFromFields(doc.fields);

  if (txData.status === "successful") {
    return { received: true };
  }

  if (status === "successful") {
    const totalAmount = Number(txData.amount);
    const txType = (txData.type as string) || "support";

    const updatedTx = { ...txData, status: "successful", successfulAt: new Date().toISOString() };
    await firestoreSet(env, `transactions/${docId}`, convertToFields(updatedTx));

    const callbackUrl = getCallbackUrl(txType, env);

    if (callbackUrl) {
      await forwardToDomainWorker(env, callbackUrl, txData, totalAmount, ref, "momo");
    } else {
      try {
        await handleGatheringPayment(env, txData, totalAmount, ref);
      } catch (handlerErr) {
        console.error(`Momo webhook: Gathering handler error for ref=${ref}:`, handlerErr);
        await logActivity(env, "error", "payment", `Momo webhook: Gathering handler error for ${ref}`, {
          error: String(handlerErr),
        });
      }
    }
  } else {
    const updatedTx = { ...txData, status: "failed" };
    await firestoreSet(env, `transactions/${docId}`, convertToFields(updatedTx));
  }

  return { received: true };
}

export async function handlePesapalIPN(
  env: Env,
  body: PesapalIPNPayload
): Promise<{
  orderNotificationType: string;
  orderTrackingId: string;
  orderMerchantReference: string;
  status: number;
}> {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;

  if (OrderNotificationType !== "IPNCHANGE") {
    return {
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    };
  }

  const authRes = await fetch(`${env.PESAPAL_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: env.PESAPAL_CONSUMER_KEY,
      consumer_secret: env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!authRes.ok) {
    const errText = await authRes.text();
    console.error("Pesapal IPN auth error:", authRes.status, errText);
    await logActivity(env, "error", "payment", "Card IPN: Pesapal auth failed", {
      status: authRes.status,
      error: errText.slice(0, 500),
    });
    throw new Error("Pesapal auth failed");
  }

  const { token } = (await authRes.json()) as { token: string };

  const statusRes = await fetch(
    `${env.PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!statusRes.ok) {
    const errText = await statusRes.text();
    console.error("Pesapal status check error:", statusRes.status, errText);
    await logActivity(env, "error", "payment", "Card IPN: Status check failed", {
      status: statusRes.status,
      error: errText.slice(0, 500),
      orderTrackingId: OrderTrackingId,
    });
    throw new Error("Transaction status check failed");
  }

  const statusData = (await statusRes.json()) as {
    payment_status_description?: string;
    payment_method?: string;
  };

  const docs = await firestoreQuery(env, "transactions", "ref", {
    stringValue: OrderMerchantReference,
  });

  if (docs.length === 0) {
    await logActivity(env, "error", "payment", "Card IPN: Transaction not found", {
      ref: OrderMerchantReference,
    });
    throw new Error("Transaction not found");
  }

  const doc = docs[0];
  const docId = extractDocId(doc.name);
  const txData = convertFromFields(doc.fields);

  if (txData.status === "successful" || txData.status === "success") {
    return {
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    };
  }

  if (statusData.payment_status_description === "Completed") {
    const totalAmount = Number(txData.amount);
    const txType = (txData.type as string) || "support";

    const updatedTx: Record<string, unknown> = {
      ...txData,
      status: "successful",
      pesapal_tracking_id: OrderTrackingId,
      payment_method: statusData.payment_method || "card",
      successfulAt: new Date().toISOString(),
    };
    await firestoreSet(env, `transactions/${docId}`, convertToFields(updatedTx));

    const callbackUrl = getCallbackUrl(txType, env);

    if (callbackUrl) {
      await forwardToDomainWorker(env, callbackUrl, txData, totalAmount, OrderMerchantReference, "card");
    } else {
      try {
        await handleGatheringPayment(env, txData, totalAmount, OrderMerchantReference);
      } catch (handlerErr) {
        console.error(`Card IPN: Gathering handler error for ref=${OrderMerchantReference}:`, handlerErr);
        await logActivity(env, "error", "payment", `Card IPN: Gathering handler error for ${OrderMerchantReference}`, {
          error: String(handlerErr),
        });
      }
    }
  } else {
    const updatedTx: Record<string, unknown> = {
      ...txData,
      status: "failed",
      updatedAt: new Date().toISOString(),
    };
    await firestoreSet(env, `transactions/${docId}`, convertToFields(updatedTx));
  }

  return {
    orderNotificationType: OrderNotificationType,
    orderTrackingId: OrderTrackingId,
    orderMerchantReference: OrderMerchantReference,
    status: 200,
  };
}
