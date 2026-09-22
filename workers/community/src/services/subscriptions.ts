import type { Env, SubscribeRequest, CallbackPayload } from "../types";
import { firestoreSet, firestoreQueryAll, firestorePost, convertToFields, convertFromFields, firestoreGet, firestoreIncrement } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { addChatMember, updateChatMemberStatus } from "./members";

function generateId(): string {
  return `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function subDocId(docName: string): string {
  const parts = docName.split("/");
  return parts[parts.length - 1];
}

async function resolveSubscriberEmail(
  env: Env,
  sub: Record<string, unknown>,
): Promise<string> {
  const stored = (sub.userEmail as string) || "";
  if (stored) return stored;

  const profileDoc = await firestoreGet(env, `profiles/${sub.userId}`);
  if (!profileDoc) return "";

  const profile = convertFromFields(profileDoc.fields as Record<string, unknown>);
  return (profile.email as string) || "";
}

async function sendRenewalEmail(
  env: Env,
  sub: Record<string, unknown>,
  status: "renewal" | "expired",
): Promise<void> {
  try {
    const userEmail = await resolveSubscriberEmail(env, sub);
    if (!userEmail) {
      console.warn(
        `[community] No email for renewal notification, userId=${sub.userId as string}`,
      );
      return;
    }

    const res = await fetch(`${env.COMMS_WORKER_URL}/api/emails/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": env.INTERNAL_AUTH_SECRET,
      },
      body: JSON.stringify({
        purpose: "subscription_renewal_reminder",
        data: {
          userEmail,
          subscriptionId: sub.id || subDocId(sub.id as string),
          tierName: sub.tierName,
          amount: sub.amount,
          currency: sub.currency || "RWF",
          interval: sub.interval,
          expiresAt: sub.expiresAt,
          creatorHandle: sub.creatorHandle,
          autoRenew: !!sub.autoRenew,
          status,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[community] Renewal email failed (${status}):`,
        res.status,
        body.slice(0, 300),
      );
    } else {
      console.info(
        `[community] Renewal email sent (${status}): userId=${sub.userId as string}`,
      );
    }
  } catch (err) {
    console.error(`[community] sendRenewalEmail error (${status}):`, err);
  }
}

async function initiateRenewalPayment(
  env: Env,
  sub: Record<string, unknown>,
  method: "momo" | "card",
  phone: string,
  request?: Request,
): Promise<{ ref?: string; redirect_url?: string }> {
  const currency = (sub.currency as string) || "RWF";
  const paymentBody: Record<string, unknown> = {
    amount: Number(sub.amount) || 0,
    creatorId: sub.creatorHandle as string,
    creatorUid: sub.creatorId as string,
    supporterId: sub.userId as string,
    type: "community",
    communityTierId: sub.tierId as string,
    communityInterval: sub.interval as string,
    communitySubscriptionId: sub.id as string,
    currency,
  };

  if (method === "momo") {
    paymentBody.phone = phone;
  } else {
    paymentBody.email = (sub.userEmail as string) || "";
    paymentBody.firstName = "";
    paymentBody.lastName = "";
  }

  const paymentsUrl = `${env.PAYMENTS_WORKER_URL}/api/payments/${method}/initiate`;
  const res = await fetch(paymentsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request?.headers?.get("Authorization") || "",
    },
    body: JSON.stringify(paymentBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Payment initiation failed");
  }

  return (await res.json()) as { ref?: string; redirect_url?: string };
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
    currency: data.currency || "RWF",
    interval: data.interval,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd.toISOString(),
    updatedAt: now,
    phone: data.phone || "",
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
    currency: data.currency || "RWF",
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

export async function renewSubscription(
  env: Env,
  data: { subscriptionId: string; paymentMethod: "momo" | "card"; phone?: string; email?: string; firstName?: string; lastName?: string; request?: Request },
  uid: string
): Promise<{
  subscriptionId: string;
  paymentRef: string;
  paymentUrl?: string;
}> {
  const doc = await firestoreGet(env, `communitySubscriptions/${data.subscriptionId}`);
  if (!doc) throw new Error("Subscription not found");
  const sub = convertFromFields(doc.fields as Record<string, unknown>);

  if ((sub.userId as string) !== uid) throw new Error("Forbidden");

  const currency = (sub.currency as string) || "RWF";
  const method: "momo" | "card" =
    currency === "USD" ? "card" : data.paymentMethod;
  if (currency !== "RWF" && data.paymentMethod === "momo") {
    throw new Error(
      "Mobile Money only supports RWF. Use card payment for other currencies.",
    );
  }

  const phone = data.phone || (sub.phone as string) || "";

  const payData = await initiateRenewalPayment(
    env,
    { ...sub, id: data.subscriptionId },
    method,
    phone,
    data.request,
  );

  await firestoreSet(env, `communitySubscriptions/${data.subscriptionId}`, convertToFields({
    ...sub,
    paymentMethod: method,
    phone: method === "momo" ? phone : (sub.phone as string) || "",
    paymentRef: payData.ref || "",
    status: "pending",
    lastRenewalAttemptAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return {
    subscriptionId: data.subscriptionId,
    paymentRef: payData.ref || "",
    paymentUrl: payData.redirect_url,
  };
}

export async function updateSubscriptionSettings(
  env: Env,
  data: { subscriptionId: string; autoRenew?: boolean; phone?: string },
  uid: string
): Promise<void> {
  const doc = await firestoreGet(env, `communitySubscriptions/${data.subscriptionId}`);
  if (!doc) throw new Error("Subscription not found");
  const sub = convertFromFields(doc.fields as Record<string, unknown>);

  if ((sub.userId as string) !== uid) throw new Error("Forbidden");

  const updated: Record<string, unknown> = { ...sub };
  if (typeof data.autoRenew === "boolean") updated.autoRenew = data.autoRenew;
  if (data.phone) updated.phone = data.phone;
  if (typeof data.autoRenew === "boolean" || data.phone) {
    updated.updatedAt = new Date().toISOString();
  }

  await firestoreSet(env, `communitySubscriptions/${data.subscriptionId}`, convertToFields(updated));
}

export async function handlePaymentCallback(
  env: Env,
  txData: Record<string, unknown>,
  totalAmount: number,
  paymentRef: string,
  paymentMethod: "momo" | "card",
  platformShare = 0,
  creatorShare = 0,
  referralShare = 0
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
    renewedAt: now,
    updatedAt: now,
  }));

  const currency = (txData.currency as string) || "RWF";
  const isUSD = currency === "USD";
  const payoutField = isUSD ? "pendingPayoutUSD" : "pendingPayout";
  const earningsField = isUSD ? "totalEarningsUSD" : "totalEarnings";

  await firestorePost(env, "platformIncome", {
    fields: convertToFields({
      amount: Math.round(platformShare),
      txRef: paymentRef,
      reason: "community_subscription",
      createdAt: now,
    }),
  });

  await firestorePost(env, "creatorIncome", {
    fields: convertToFields({
      creatorUid: txData.creatorUid as string,
      amount: Math.round(creatorShare),
      txRef: paymentRef,
      reason: "community_subscription",
      createdAt: now,
    }),
  });

  await firestoreIncrement(env, `creators/${txData.creatorId}`, {
    [earningsField]: Math.round(creatorShare),
    [payoutField]: Math.round(creatorShare),
  });

  if (referralShare > 0 && txData.referralUid) {
    await firestorePost(env, "creatorIncome", {
      fields: convertToFields({
        creatorUid: txData.referralUid as string,
        amount: Math.round(referralShare),
        txRef: paymentRef,
        reason: "referral_commission",
        createdAt: now,
      }),
    });

    await firestoreIncrement(env, `creators/${txData.referralId}`, {
      [earningsField]: Math.round(referralShare),
      [payoutField]: Math.round(referralShare),
    });
  }

  const profileDoc = await firestoreGet(env, `profiles/${sub.userId}`);
  const userName = profileDoc
    ? ((convertFromFields(profileDoc.fields as Record<string, unknown>).displayName as string) || (sub.userEmail as string) || "")
    : (sub.userEmail as string) || "";

  await addChatMember(env, sub.creatorHandle as string, sub.tierId as string, sub.userId as string, userName, "active", sub.tierName as string);

  await logActivity(env, "info", "community", `Subscription ${subscriptionId} activated`, {
    paymentRef,
    amount: totalAmount,
    tierId: sub.tierId,
    creatorShare,
    platformShare,
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
    const subId = subDocId(doc.name);
    const autoRenew = !!sub.autoRenew;
    const currency = (sub.currency as string) || "RWF";
    const canAutocharge = currency === "RWF" && !!sub.phone;

    // Case 1: Already expired — mark as expired, revoke access, notify, email
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
        link: `/community/manage/${subId}`,
        metadata: { subscriptionId: subId, tierId, status: "expired" },
      }).catch((err) => { console.error("Failed to create subscription expired notification", err); });

      if (!sub.expiryEmailSent) {
        await sendRenewalEmail(env, { ...sub, id: subId }, "expired");
        await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
          ...sub,
          status: "expired",
          autoRenew: false,
          expiryEmailSent: true,
          updatedAt: now.toISOString(),
        }));
      }

      await logActivity(env, "info", "community", `Subscription ${subId} auto-expired`, {
        userId,
        tier: tierName,
        expiresAt: expiresAt.toISOString(),
      });

      continue;
    }

    // Case 2: Expiring within 7 days and cannot auto-renew — warn once
    if (
      expiresAt <= sevenDaysFromNow &&
      (!autoRenew || !canAutocharge) &&
      !sub.renewalEmailSent
    ) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (!autoRenew) {
        await createNotification(env, {
          userId,
          type: "subscription_expiring",
          title: "Subscription Expiring Soon",
          message: `Your ${tierName} subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep access.`,
          link: `/community/manage/${subId}`,
          metadata: { subscriptionId: subId, tierId, expiresAt: expiresAt.toISOString(), daysLeft },
        }).catch((err) => { console.error("Failed to create subscription expiring notification", err); });
      }

      await sendRenewalEmail(env, { ...sub, id: subId }, "renewal");

      await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
        ...sub,
        renewalEmailSent: true,
        updatedAt: now.toISOString(),
      }));

      continue;
    }

    // Case 3: Expiring within 3 days and auto-renew enabled
    if (expiresAt <= threeDaysFromNow && autoRenew) {
      if (!canAutocharge) {
        // No way to charge automatically (USD tier or no stored phone) —
        // turn off auto-renew and direct the user to the renewal page.
        await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
          ...sub,
          autoRenew: false,
          updatedAt: now.toISOString(),
        }));

        await createNotification(env, {
          userId,
          type: "subscription_renewal_failed",
          title: "Renewal Requires Your Action",
          message: `We can't auto-renew your ${tierName} subscription. Renew on the renewal page to keep access.`,
          link: `/community/manage/${subId}`,
          metadata: { subscriptionId: subId, tierId, reason: "cannot_autocharge" },
        }).catch((err) => { console.error("Failed to create renewal action notification", err); });

        if (!sub.renewalEmailSent) {
          await sendRenewalEmail(env, { ...sub, id: subId }, "renewal");
          await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
            ...sub,
            autoRenew: false,
            renewalEmailSent: true,
            updatedAt: now.toISOString(),
          }));
        }

        continue;
      }

      try {
        const payData = await initiateRenewalPayment(env, { ...sub, id: subId }, "momo", sub.phone as string);

        await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
          ...sub,
          paymentRef: payData.ref || "",
          status: "pending",
          lastRenewalAttemptAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }));

        console.info(`[community] Auto-renewal initiated for ${subId}: ref=${payData.ref}`);
      } catch (err) {
        console.error(`Renewal failed for ${subId}:`, err);
        await createNotification(env, {
          userId,
          type: "subscription_renewal_failed",
          title: "Renewal Failed",
          message: `We couldn't renew your ${tierName} subscription. Update your payment method to keep access.`,
          link: `/community/manage/${subId}`,
          metadata: { subscriptionId: subId, tierId, error: String(err).slice(0, 200) },
        }).catch((err) => { console.error("Failed to create renewal failed notification", err); });

        if (!sub.renewalEmailSent) {
          await sendRenewalEmail(env, { ...sub, id: subId }, "renewal");
          await firestoreSet(env, `communitySubscriptions/${subId}`, convertToFields({
            ...sub,
            renewalEmailSent: true,
            updatedAt: now.toISOString(),
          }));
        }
      }
    }
  }
}