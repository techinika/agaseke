import type { Env, SubscribeRequest } from "../types";
import { firestoreSet, firestoreQueryAll, convertToFields, convertFromFields, firestoreGet } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { addChatMember, updateChatMemberStatus } from "./members";

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
            currency: (sub.currency as string) || "RWF",
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
            currency: (sub.currency as string) || "RWF",
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

  const profileDoc = await firestoreGet(env, `profiles/${sub.userId}`);
  const userName = profileDoc
    ? ((convertFromFields(profileDoc.fields as Record<string, unknown>).displayName as string) || (sub.userEmail as string) || "")
    : (sub.userEmail as string) || "";

  await addChatMember(env, sub.creatorHandle as string, sub.tierId as string, sub.userId as string, userName, "active", sub.tierName as string);

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

  await updateChatMemberStatus(env, sub.creatorHandle as string, sub.tierId as string, sub.userId as string, "cancelled");
}

export async function processRenewals(env: Env): Promise<void> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const docs = await firestoreQueryAll(env, "communitySubscriptions", "status", { stringValue: "active" });

  for (const doc of docs) {
    const sub = convertFromFields(doc.fields);
    const expiresAt = new Date(sub.expiresAt as string);
    const userId = sub.userId as string;
    const tierName = (sub.tierName as string) || "your subscription";
    const creatorHandle = sub.creatorHandle as string;
    const tierId = sub.tierId as string;
    const subId = sub.id as string;
    const autoRenew = !!sub.autoRenew;

    // Case 1: Already expired — mark as expired, revoke access, notify
    if (expiresAt <= now) {
      await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
        ...sub,
        status: "expired",
        autoRenew: false,
        updatedAt: now.toISOString(),
      }));

      await updateChatMemberStatus(env, creatorHandle, tierId, userId, "expired");

      await createNotification(env, {
        userId,
        type: "subscription_expired",
        title: "Subscription Ended",
        message: `Your ${tierName} subscription has ended. Renew to keep your benefits and community access.`,
        link: `/${creatorHandle}/community`,
        metadata: { subscriptionId: subId, tierId, status: "expired" },
      }).catch(() => {});

      await logActivity(env, "info", "community", `Subscription ${subId} auto-expired`, {
        userId,
        tier: tierName,
        expiresAt: expiresAt.toISOString(),
      });

      continue;
    }

    // Case 2: Expiring within 7 days, no auto-renew — warn once
    if (expiresAt <= sevenDaysFromNow && !autoRenew && !sub.renewalWarningSent) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      await createNotification(env, {
        userId,
        type: "subscription_expiring",
        title: "Subscription Expiring Soon",
        message: `Your ${tierName} subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep access.`,
        link: `/${creatorHandle}/community`,
        metadata: { subscriptionId: subId, tierId, expiresAt: expiresAt.toISOString(), daysLeft },
      }).catch(() => {});

      await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
        ...sub,
        renewalWarningSent: true,
        updatedAt: now.toISOString(),
      }));
    }

    // Case 3: Expiring within 3 days, auto-renew enabled — attempt renewal
    if (expiresAt <= threeDaysFromNow && autoRenew) {
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
            creatorId: creatorHandle,
            creatorUid: sub.creatorId,
            supporterId: userId,
            type: "community",
            communityTierId: tierId,
            communityInterval: sub.interval,
            communitySubscriptionId: subId,
    currency: data.currency || "RWF",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Renewal failed for ${subId}:`, errText);
          await createNotification(env, {
            userId,
            type: "subscription_renewal_failed",
            title: "Renewal Failed",
            message: `We couldn't renew your ${tierName} subscription. Update your payment method to keep access.`,
            link: `/${creatorHandle}/community`,
            metadata: { subscriptionId: subId, tierId, error: errText.slice(0, 200) },
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`Renewal error for ${subId}:`, err);
      }
    }
  }
}
