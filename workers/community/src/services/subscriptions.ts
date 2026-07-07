import type { Env, SubscribeRequest } from "../types";
import { firestorePost, firestoreSet, firestoreQueryAll, convertToFields, convertFromFields, firestoreGet } from "../firestore";
import { logActivity } from "../logger";
import { notifyAdmins } from "../adminNotifications";

function generateId(): string {
  return `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function initiateSubscription(
  env: Env,
  data: SubscribeRequest,
  uid: string
): Promise<{
  subscriptionId: string;
  paymentRef: string;
  paymentUrl?: string;
}> {
  const subscriptionId = generateId();
  const now = new Date().toISOString();
  const periodEnd = new Date();
  if (data.interval === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const subFields = {
    id: subscriptionId,
    tierId: data.tierId,
    tierName: data.tierName,
    userId: uid,
    userEmail: data.email || "",
    userName: "",
    creatorId: data.creatorId,
    creatorHandle: data.creatorHandle,
    subscribedAt: now,
    expiresAt: periodEnd.toISOString(),
    status: "pending",
    paymentMethod: data.paymentMethod,
    autoRenew: true,
    amount: data.amount,
    interval: data.interval,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd.toISOString(),
    updatedAt: now,
  };

  await firestoreSet(env, `communitySubscriptions/${subscriptionId}`, convertToFields(subFields));

  const paymentsUrl = `${env.PAYMENTS_WORKER_URL}/api/payments/${data.paymentMethod}/initiate`;
  const paymentBody: Record<string, unknown> = {
    amount: data.amount,
    creatorId: data.creatorHandle,
    creatorUid: data.creatorId,
    supporterId: data.supporterId || uid,
    type: "community",
    communityTierId: data.tierId,
    communityInterval: data.interval,
    communitySubscriptionId: subscriptionId,
    currency: "RWF",
  };

  if (data.paymentMethod === "momo") {
    paymentBody.phone = data.phone || "";
  } else {
    paymentBody.email = data.email || "";
    paymentBody.firstName = data.firstName || "Supporter";
    paymentBody.lastName = data.lastName || "";
  }

  const res = await fetch(paymentsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: data.request?.headers?.get("Authorization") || "",
    },
    body: JSON.stringify(paymentBody),
  });

  if (!res.ok) {
    const err = await res.text();
    await firestoreSet(env, `communitySubscriptions/${subscriptionId}`, convertToFields({
      ...subFields,
      status: "failed",
      error: err.slice(0, 500),
    }));
    throw new Error(err || "Payment initiation failed");
  }

  const payData = (await res.json()) as { ref?: string; redirect_url?: string };

  await firestoreSet(env, `communitySubscriptions/${subscriptionId}`, convertToFields({
    ...subFields,
    paymentRef: payData.ref || "",
  }));

  return {
    subscriptionId,
    paymentRef: payData.ref || "",
    paymentUrl: payData.redirect_url,
  };
}

export async function handlePaymentCallback(
  env: Env,
  txData: Record<string, unknown>,
  totalAmount: number,
  paymentRef: string,
  paymentMethod: "momo" | "card"
): Promise<void> {
  const subscriptionId = txData.communitySubscriptionId as string;
  if (!subscriptionId) {
    console.error("Community callback: no subscriptionId in txData");
    return;
  }

  const doc = await firestoreGet(env, `communitySubscriptions/${subscriptionId}`);
  if (!doc) {
    console.error(`Community callback: subscription ${subscriptionId} not found`);
    return;
  }

  const fields = doc.fields as Record<string, unknown>;
  const sub = convertFromFields(fields);

  if (sub.status === "active") return;

  const now = new Date().toISOString();
  const periodEnd = new Date();
  if (sub.interval === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await firestoreSet(env, `communitySubscriptions/${subscriptionId}`, convertToFields({
    ...sub,
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd.toISOString(),
    expiresAt: periodEnd.toISOString(),
    lastPaymentRef: paymentRef,
    lastPaymentAt: now,
    updatedAt: now,
  }));

  await logActivity(env, "info", "community", `Subscription ${subscriptionId} activated`, {
    paymentRef,
    amount: totalAmount,
    tierId: sub.tierId,
  });
}

export async function cancelSubscription(
  env: Env,
  subscriptionId: string,
  userId: string
): Promise<void> {
  const doc = await firestoreGet(env, `communitySubscriptions/${subscriptionId}`);
  if (!doc) throw new Error("Subscription not found");

  const sub = convertFromFields(doc.fields as Record<string, unknown>);
  if (sub.userId !== userId) throw new Error("Forbidden");

  await firestoreSet(env, `communitySubscriptions/${subscriptionId}`, convertToFields({
    ...sub,
    autoRenew: false,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  }));
}

export async function processRenewals(env: Env): Promise<void> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const docs = await firestoreQueryAll(env, "communitySubscriptions", "status", { stringValue: "active" });

  for (const doc of docs) {
    const sub = convertFromFields(doc.fields);
    if (!sub.autoRenew) continue;

    const expiresAt = new Date(sub.expiresAt as string);
    if (expiresAt > threeDaysFromNow || expiresAt < now) continue;

    try {
      const paymentsUrl = `${env.PAYMENTS_WORKER_URL}/api/payments/momo/initiate`;
      const res = await fetch(paymentsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth": env.INTERNAL_AUTH_SECRET,
        },
        body: JSON.stringify({
          amount: sub.amount,
          phone: sub.phone || "",
          creatorId: sub.creatorHandle,
          creatorUid: sub.creatorId,
          supporterId: sub.userId,
          type: "community",
          communityTierId: sub.tierId,
          communityInterval: sub.interval,
          communitySubscriptionId: sub.id,
          currency: "RWF",
        }),
      });

      if (!res.ok) {
        console.error(`Renewal failed for ${sub.id}:`, await res.text());
      }
    } catch (err) {
      console.error(`Renewal error for ${sub.id}:`, err);
    }
  }
}
