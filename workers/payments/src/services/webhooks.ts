import type { Env, PesapalIPNPayload } from "../types";
import {
  convertFromFields,
  convertToFields,
  firestoreCreateIfAbsent,
  firestoreDeleteIfExists,
  firestoreDocumentName,
  firestoreGet,
  firestoreIncrement,
  firestorePost,
  firestoreQuery,
  firestoreSet,
  firestoreUpdateWithPrecondition,
  type FirestoreCommitResult,
} from "../firestore";
import { logActivity } from "../logger";
import { createNotification, notifyAdmins } from "../adminNotifications";
import {
  processPaymentEvent,
  type PaymentEventStore,
} from "./eventProcessor";
import {
  WebhookError,
  verifyPaypackEvent,
  verifyPaypackSignature,
  verifyPesapalStatus,
} from "./webhookVerify";

function extractDocId(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

function safeEventId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 400);
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

function isConflict(result: FirestoreCommitResult): boolean {
  return (
    result.status === 409 ||
    result.status === 412 ||
    result.status === 404 ||
    result.errorStatus === "ALREADY_EXISTS" ||
    result.errorStatus === "FAILED_PRECONDITION" ||
    result.errorStatus === "NOT_FOUND"
  );
}

function createFirestoreEventStore(env: Env): PaymentEventStore {
  return {
    async recordEventOnce(eventId, data) {
      return firestoreCreateIfAbsent(
        env,
        `webhookEvents/${safeEventId(eventId)}`,
        convertToFields({ eventId, ...data }),
      );
    },

    async deleteEvent(eventId) {
      await firestoreDeleteIfExists(env, `webhookEvents/${safeEventId(eventId)}`);
    },

    async commitSuccess({ docId, updateTime, fields, paymentRef, outboxFields }) {
      const creditId = safeEventId(paymentRef);
      const marker = await firestoreGet(env, `paymentCredits/${creditId}`);

      if (marker) {
        const result = await firestoreUpdateWithPrecondition(
          env,
          `transactions/${docId}`,
          convertToFields(fields),
          updateTime,
        );
        if (result.ok) {
          return { ok: true, alreadyCredited: true, conflict: false };
        }
        return {
          ok: false,
          alreadyCredited: false,
          conflict: isConflict(result),
        };
      }

      const markerWrite = {
        update: {
          name: firestoreDocumentName(env, `paymentCredits/${creditId}`),
          fields: convertToFields({
            paymentRef,
            docId,
            createdAt: new Date().toISOString(),
          }),
        },
        currentDocument: { exists: false },
      };

      const extraWrites: unknown[] = [markerWrite];
      if (outboxFields) {
        extraWrites.push({
          update: {
            name: firestoreDocumentName(env, `paymentDispatches/${creditId}`),
            fields: convertToFields({
              paymentRef,
              docId,
              status: "pending",
              attempts: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...outboxFields,
            }),
          },
          currentDocument: { exists: false },
        });
      }

      const result = await firestoreUpdateWithPrecondition(
        env,
        `transactions/${docId}`,
        convertToFields(fields),
        updateTime,
        extraWrites,
      );

      if (result.ok) {
        return { ok: true, alreadyCredited: false, conflict: false };
      }
      return {
        ok: false,
        alreadyCredited: false,
        conflict: isConflict(result),
      };
    },

    async markDispatch({ paymentRef, status, error }) {
      const creditId = safeEventId(paymentRef);
      const existing = await firestoreGet(env, `paymentDispatches/${creditId}`);
      const base = existing?.fields
        ? convertFromFields(existing.fields as Record<string, unknown>)
        : {};
      await firestoreSet(env, `paymentDispatches/${creditId}`, convertToFields({
        ...base,
        status,
        lastError: error ? String(error).slice(0, 1000) : null,
        updatedAt: new Date().toISOString(),
        ...(status === "delivered" ? { deliveredAt: new Date().toISOString() } : {}),
      }));
    },

    async updateState({ docId, updateTime, fields }) {
      const result = await firestoreUpdateWithPrecondition(
        env,
        `transactions/${docId}`,
        convertToFields(fields),
        updateTime,
      );
      if (result.ok) return { ok: true, conflict: false };
      return { ok: false, conflict: isConflict(result) };
    },
  };
}

async function forwardToDomainWorker(
  env: Env,
  callbackUrl: string,
  txData: Record<string, unknown>,
  totalAmount: number,
  paymentRef: string,
  paymentMethod: "momo" | "card",
): Promise<boolean> {
  const includeReferral = !!txData.includeReferral;
  const platformSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL || 0.15)
    : Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.15);
  const creatorSharePercentage = Number(env.NEXT_PUBLIC_CREATOR_SHARE || 0.8);
  const referralSharePercentage = Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);

  const platformShare = Number(
    txData.platformFee ?? totalAmount * platformSharePercentage,
  );
  const creatorShare = Number(
    txData.creatorEarnings ?? totalAmount * creatorSharePercentage,
  );
  const referralShare = Number(
    txData.referralEarnings ?? totalAmount * referralSharePercentage,
  );

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
      console.error(
        `Callback to ${callbackUrl} failed: ${res.status} ${errText}`,
      );
      await logActivity(
        env,
        "error",
        "payment",
        `Callback to domain worker failed`,
        {
          callbackUrl,
          status: res.status,
          error: errText.slice(0, 500),
          paymentRef,
        },
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Callback to ${callbackUrl} error:`, err);
    await logActivity(
      env,
      "error",
      "payment",
      `Callback to domain worker error`,
      {
        callbackUrl,
        error: String(err),
        paymentRef,
      },
    );
    return false;
  }
}

async function handleGatheringPayment(
  env: Env,
  txData: Record<string, unknown>,
  totalAmount: number,
  txRef: string,
): Promise<boolean> {
  const currency = (txData.currency as string) || "RWF";
  const isUSD = currency === "USD";
  const payoutField = isUSD ? "pendingPayoutUSD" : "pendingPayout";
  const earningsField = isUSD ? "totalEarningsUSD" : "totalEarnings";
  const includeReferral = !!txData.includeReferral;
  const platformSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL || 0.15)
    : Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.15);
  const creatorSharePercentage = Number(env.NEXT_PUBLIC_CREATOR_SHARE || 0.8);
  const referralSharePercentage = Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);

  const platformShare = Number(
    txData.platformFee ?? totalAmount * platformSharePercentage,
  );
  const creatorShare = Number(
    txData.creatorEarnings ?? totalAmount * creatorSharePercentage,
  );
  const referralShare = Number(
    txData.referralEarnings ?? totalAmount * referralSharePercentage,
  );

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
    [earningsField]: Math.round(creatorShare),
    [payoutField]: Math.round(creatorShare),
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
      [earningsField]: Math.round(referralShare),
      [payoutField]: Math.round(referralShare),
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
    `Ticket sale of ${totalAmount.toLocaleString()} ${(txData.currency as string) || "RWF"} from ${(txData.attendeeName as string) || "someone"}`,
    "/admin/transactions",
  );
  return true;
}

function dispatchSuccess(
  env: Env,
  txData: Record<string, unknown>,
  totalAmount: number,
  paymentRef: string,
  paymentMethod: "momo" | "card",
): () => Promise<boolean> {
  return async () => {
    const txType = (txData.type as string) || "support";
    const callbackUrl = getCallbackUrl(txType, env);
    try {
      if (callbackUrl) {
        return await forwardToDomainWorker(
          env,
          callbackUrl,
          txData,
          totalAmount,
          paymentRef,
          paymentMethod,
        );
      }
      return await handleGatheringPayment(env, txData, totalAmount, paymentRef);
    } catch (handlerErr) {
      console.error(
        `Payment ${paymentRef}: domain dispatch error:`,
        handlerErr,
      );
      await logActivity(
        env,
        "error",
        "payment",
        `Payment ${paymentRef}: domain dispatch error`,
        { error: String(handlerErr) },
      );
      return false;
    }
  };
}

export async function handlePaypackWebhook(
  env: Env,
  body: string,
  signature: string | null,
): Promise<{ received: boolean }> {
  const valid = await verifyPaypackSignature(
    body,
    env.PAYPACK_WEBHOOK_SECRET,
    signature,
  );
  if (!valid) {
    await logActivity(
      env,
      "error",
      "payment",
      "Momo webhook: Invalid signature",
      { signaturePresent: Boolean(signature) },
    );
    throw new WebhookError("INVALID_SIGNATURE", "Invalid signature", 401);
  }

  let payload: {
    data?: {
      ref?: unknown;
      status?: unknown;
      amount?: unknown;
      currency?: unknown;
    };
  };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch {
    throw new WebhookError(
      "INVALID_PAYLOAD",
      "Invalid webhook JSON",
      400,
    );
  }

  const { ref, status, amount, currency } = payload.data || {};
  if (typeof ref !== "string" || !ref.trim()) {
    throw new WebhookError(
      "MISSING_REFERENCE",
      "Missing transaction ref",
      400,
    );
  }

  const docs = await firestoreQuery(env, "transactions", "ref", {
    stringValue: ref,
  });
  if (docs.length === 0) {
    await logActivity(
      env,
      "error",
      "payment",
      "Momo webhook: Transaction not found",
      { ref },
    );
    throw new WebhookError(
      "TRANSACTION_NOT_FOUND",
      "Transaction not found",
      404,
    );
  }

  const doc = docs[0];
  const docId = extractDocId(doc.name);
  const txData = convertFromFields(doc.fields);
  const updateTime = typeof doc.updateTime === "string" ? doc.updateTime : undefined;

  const verified = verifyPaypackEvent(
    {
      ref,
      status: String(status ?? ""),
      amount: typeof amount === "number" ? amount : Number(amount),
      currency: typeof currency === "string" ? currency : undefined,
    },
    txData,
  );

  const result = await processPaymentEvent(createFirestoreEventStore(env), {
    eventId: `paypack:${ref}:${String(status ?? "").toLowerCase()}`,
    docId,
    updateTime,
    txData,
    nextState: verified.state,
    paymentRef: ref,
    provider: "paypack",
    providerStatus: String(status ?? ""),
    outboxFields:
      verified.state === "successful"
        ? {
            txType: (txData.type as string) || "support",
            paymentMethod: "momo",
            totalAmount: verified.amount,
            txData,
          }
        : undefined,
    dispatch:
      verified.state === "successful"
        ? dispatchSuccess(
            env,
            txData,
            verified.amount,
            ref,
            "momo",
          )
        : undefined,
  });

  if (result.duplicate) {
    console.log("[paypack-webhook] duplicate event ignored", { ref });
  }

  return { received: true };
}

export async function handlePesapalIPN(
  env: Env,
  body: PesapalIPNPayload,
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

  if (!OrderTrackingId || !OrderMerchantReference) {
    throw new WebhookError(
      "MISSING_REFERENCE",
      "Missing Pesapal tracking or merchant reference",
      400,
    );
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
    throw new WebhookError(
      "PROVIDER_AUTH_FAILED",
      "Pesapal auth failed",
      502,
    );
  }

  const { token } = (await authRes.json()) as { token: string };

  const statusRes = await fetch(
    `${env.PESAPAL_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(OrderTrackingId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!statusRes.ok) {
    const errText = await statusRes.text();
    console.error("Pesapal status check error:", statusRes.status, errText);
    await logActivity(env, "error", "payment", "Card IPN: Status check failed", {
      status: statusRes.status,
      error: errText.slice(0, 500),
      orderTrackingId: OrderTrackingId,
    });
    throw new WebhookError(
      "PROVIDER_STATUS_FAILED",
      "Transaction status check failed",
      502,
    );
  }

  const statusData = (await statusRes.json()) as {
    payment_status_description?: string;
    payment_status?: string;
    status_code?: number | string;
    payment_method?: string;
    merchant_reference?: string;
    amount?: number | string;
    currency?: string;
    order_tracking_id?: string;
  };

  const docs = await firestoreQuery(env, "transactions", "ref", {
    stringValue: OrderMerchantReference,
  });

  if (docs.length === 0) {
    await logActivity(env, "error", "payment", "Card IPN: Transaction not found", {
      ref: OrderMerchantReference,
    });
    throw new WebhookError(
      "TRANSACTION_NOT_FOUND",
      "Transaction not found",
      404,
    );
  }

  const doc = docs[0];
  const docId = extractDocId(doc.name);
  const txData = convertFromFields(doc.fields);
  const updateTime = typeof doc.updateTime === "string" ? doc.updateTime : undefined;

  const verified = verifyPesapalStatus({
    bodyTrackingId: OrderTrackingId,
    bodyMerchantReference: OrderMerchantReference,
    stored: txData,
    status: statusData,
  });

  const extraFields: Record<string, unknown> = {
    pesapal_tracking_id: OrderTrackingId,
    payment_method: statusData.payment_method || "card",
  };
  if (verified.bindTrackingId) {
    extraFields.orderTrackingId = OrderTrackingId;
  }

  const result = await processPaymentEvent(createFirestoreEventStore(env), {
    eventId: `pesapal:${OrderMerchantReference}:${OrderTrackingId}:${statusData.payment_status_description || statusData.status_code || "unknown"}`,
    docId,
    updateTime,
    txData,
    nextState: verified.state,
    extraFields,
    paymentRef: OrderMerchantReference,
    provider: "pesapal",
    providerStatus:
      statusData.payment_status_description ||
      String(statusData.status_code ?? ""),
    outboxFields:
      verified.state === "successful"
        ? {
            txType: (txData.type as string) || "support",
            paymentMethod: "card",
            totalAmount: verified.amount,
            txData,
          }
        : undefined,
    dispatch:
      verified.state === "successful"
        ? dispatchSuccess(
            env,
            txData,
            verified.amount,
            OrderMerchantReference,
            "card",
          )
        : undefined,
  });

  if (result.duplicate) {
    console.log("[pesapal-ipn] duplicate event ignored", {
      ref: OrderMerchantReference,
    });
  }

  return {
    orderNotificationType: OrderNotificationType,
    orderTrackingId: OrderTrackingId,
    orderMerchantReference: OrderMerchantReference,
    status: 200,
  };
}


/**
 * Retry a previously recorded dispatch outbox record (AGA-PAY-004).
 * Returns true when the domain callback accepted the payment.
 */
export async function retryDispatchFromOutbox(
  env: Env,
  record: Record<string, unknown>,
): Promise<boolean> {
  const paymentRef = String(record.paymentRef ?? "");
  const txData = (record.txData as Record<string, unknown>) || {};
  const totalAmount = Number(record.totalAmount ?? txData.amount ?? 0);
  const paymentMethod =
    record.paymentMethod === "card" ? "card" : "momo";
  const txType =
    String(record.txType ?? txData.type ?? "support") || "support";
  if (!paymentRef || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return false;
  }

  const callbackUrl = getCallbackUrl(txType, env);
  try {
    if (callbackUrl) {
      return await forwardToDomainWorker(
        env,
        callbackUrl,
        txData,
        totalAmount,
        paymentRef,
        paymentMethod,
      );
    }
    return await handleGatheringPayment(env, txData, totalAmount, paymentRef);
  } catch (err) {
    console.error(`[dispatch-outbox] retry failed for ${paymentRef}`, err);
    return false;
  }
}

const MAX_DISPATCH_ATTEMPTS = 10;

async function markOutbox(
  env: Env,
  paymentRef: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await firestoreSet(
    env,
    `paymentDispatches/${safeEventId(paymentRef)}`,
    convertToFields(fields),
  );
}

/**
 * Drain failed/stale outbox records. Called from the worker's scheduled
 * handler. Uses exponential backoff and a dead-letter terminal state.
 */
export async function drainDispatchOutbox(
  env: Env,
  limit = 20,
): Promise<{ processed: number; delivered: number; failed: number; dead: number }> {
  const summary = { processed: 0, delivered: 0, failed: 0, dead: 0 };
  const now = Date.now();

  let records: Array<Record<string, unknown>> = [];
  try {
    const failed = await firestoreQuery(env, "paymentDispatches", "status", {
      stringValue: "failed",
    }, limit);
    const pending = await firestoreQuery(env, "paymentDispatches", "status", {
      stringValue: "pending",
    }, limit);
    records = [...failed, ...pending]
      .map((d): Record<string, unknown> => ({
        name: d.name,
        ...convertFromFields(d.fields),
      }))
      .filter((r: Record<string, unknown>) => {
        // Only retry pending records older than two minutes so an in-flight
        // webhook dispatch is not duplicated.
        if (String(r.status) === "pending") {
          const created = Date.parse(String(r.createdAt ?? ""));
          return Number.isFinite(created) && now - created > 2 * 60 * 1000;
        }
        const next = Date.parse(String(r.nextAttemptAt ?? ""));
        return !Number.isFinite(next) || next <= now;
      })
      .slice(0, limit);
  } catch (err) {
    console.error("[dispatch-outbox] query failed", err);
    return summary;
  }

  for (const record of records) {
    summary.processed += 1;
    const base: Record<string, unknown> = { ...record };
    delete base.name;
    const paymentRef = String(record.paymentRef ?? "");
    const attempts = Number(record.attempts ?? 0) + 1;
    if (!paymentRef || attempts > MAX_DISPATCH_ATTEMPTS) {
      await markOutbox(env, paymentRef, {
        ...base,
        status: "dead",
        attempts,
        lastError: "max attempts exceeded",
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
      summary.dead += 1;
      continue;
    }

    const ok = await retryDispatchFromOutbox(env, record);
    if (ok) {
      await markOutbox(env, paymentRef, {
        ...base,
        status: "delivered",
        attempts,
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
      summary.delivered += 1;
      continue;
    }

    const backoffMs = Math.min(60 * 60 * 1000, 5000 * 2 ** (attempts - 1));
    await markOutbox(env, paymentRef, {
      ...base,
      status: "failed",
      attempts,
      lastError: "domain callback failed",
      nextAttemptAt: new Date(Date.now() + backoffMs).toISOString(),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    summary.failed += 1;
  }

  return summary;
}
