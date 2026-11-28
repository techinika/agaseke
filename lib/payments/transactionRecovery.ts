import crypto from "node:crypto";
import { adminDb } from "@/db/firebaseAdmin";
import { resolveHistoricalCurrency } from "@/lib/money";

export class TransactionRecoveryError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "TransactionRecoveryError";
    this.statusCode = statusCode;
  }
}

export interface RecoveryResult {
  ref: string;
  method: "momo" | "card";
  redirect_url: string;
  merchant_reference: string;
}

const CARD_LINK_FRESH_MS = 15 * 60 * 1000;
const STALL_TIMEOUT_MS = 15 * 60 * 1000;

function toStr(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isNonEmptyUid(value: unknown): value is string {
  const s = toStr(value).trim();
  return s.length > 0 && s.toLowerCase() !== "anonymous";
}

function isTransactionOwner(
  tx: Record<string, unknown>,
  uid: string,
  userEmail?: string | null,
): boolean {
  const uidCandidates = [
    tx.supporterId,
    tx.initiatedBy,
    tx.buyerId,
    tx.userId,
    tx.uid,
    tx.payerUid,
  ].filter(isNonEmptyUid);

  if (uidCandidates.some((candidate) => candidate === uid)) {
    return true;
  }

  const normalizedEmail = toStr(userEmail).trim().toLowerCase();
  if (uidCandidates.length === 0 && normalizedEmail) {
    const emailCandidates = [tx.email, tx.buyerEmail, tx.attendeeEmail]
      .map((v) => toStr(v).trim().toLowerCase())
      .filter(Boolean);
    if (emailCandidates.includes(normalizedEmail)) {
      return true;
    }
  }

  return false;
}

function resolveEffectiveStatus(tx: Record<string, unknown>, nowMs = Date.now()): string {
  const raw = toStr(tx.status).trim().toLowerCase() || "pending";
  if (raw === "canceled") return "cancelled";
  if (raw === "stale") return "stalled";
  if (raw === "pending") {
    const tsRaw = toStr(tx.initiatedAt) || toStr(tx.createdAt);
    const tsMs = Date.parse(tsRaw);
    if (Number.isFinite(tsMs) && nowMs - tsMs >= STALL_TIMEOUT_MS) {
      return "stalled";
    }
  }
  return raw;
}

export function isSafeCheckoutUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

export function isFreshCardRedirectLink(
  tx: Record<string, unknown>,
  nowMs = Date.now(),
): boolean {
  const url = toStr(tx.redirectUrl).trim();
  if (!url || !isSafeCheckoutUrl(url)) return false;

  const tsRaw =
    toStr(tx.redirectUrlGeneratedAt) ||
    toStr(tx.updatedAt) ||
    toStr(tx.initiatedAt) ||
    toStr(tx.createdAt);
  if (!tsRaw) return false;
  const tsMs = Date.parse(tsRaw);
  if (!Number.isFinite(tsMs)) return false;
  return nowMs - tsMs < CARD_LINK_FRESH_MS;
}

function inferMethod(tx: Record<string, unknown>): "momo" | "card" {
  const method = toStr(tx.paymentMethod).toLowerCase();
  if (method === "card") return "card";
  if (method === "momo") return "momo";
  if (
    toStr(tx.paymentProvider).toLowerCase() === "pesapal" ||
    toStr(tx.ref).startsWith("AGS-CARD-") ||
    Boolean(toStr(tx.redirectUrl))
  ) {
    return "card";
  }
  return "momo";
}

function resolveCallbackBase(requestOrigin?: string | null): string {
  const configured = (process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me")
    .trim()
    .replace(/\/+$/, "");
  const allowed = new Set<string>([
    "https://agaseke.me",
    "https://www.agaseke.me",
    "https://staging.agaseke.me",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  try {
    allowed.add(new URL(configured).origin);
  } catch {
    // ignore malformed env URL
  }
  const origin = (requestOrigin || "").trim().replace(/\/+$/, "");
  if (origin && allowed.has(origin)) return origin;
  return configured;
}

async function findTransactionByRef(ref: string): Promise<{
  docId: string;
  data: Record<string, unknown>;
} | null> {
  const directSnap = await adminDb.collection("transactions").doc(ref).get();
  if (directSnap.exists) {
    return {
      docId: directSnap.id,
      data: (directSnap.data() || {}) as Record<string, unknown>,
    };
  }

  for (const field of ["ref", "providerRef", "orderTrackingId"] as const) {
    const querySnap = await adminDb
      .collection("transactions")
      .where(field, "==", ref)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      const snap = querySnap.docs[0];
      return {
        docId: snap.id,
        data: (snap.data() || {}) as Record<string, unknown>,
      };
    }
  }

  return null;
}

function describePayment(
  type: string,
  creatorHandle: string,
  productName?: string,
): string {
  const label = (() => {
    switch (type) {
      case "store":
        return `Purchase: ${productName || "Store item"}`;
      case "booking":
        return `Booking payment for ${creatorHandle}`;
      case "gathering":
        return `Gathering ticket for ${creatorHandle}`;
      case "community":
        return `Community subscription to ${creatorHandle}`;
      case "gift":
        return `Gift for ${creatorHandle}`;
      default:
        return `Support for ${creatorHandle}`;
    }
  })();
  return label.slice(0, 100);
}

async function createFreshCardCheckout(params: {
  tx: Record<string, unknown>;
  uid: string;
  userEmail: string | null;
  currency: string;
  requestOrigin?: string | null;
}): Promise<{
  ref: string;
  redirectUrl: string;
  orderTrackingId: string;
}> {
  const pesapalUrl = (process.env.PESAPAL_URL || "").trim().replace(/\/+$/, "");
  const consumerKey = (process.env.PESAPAL_CONSUMER_KEY || "").trim();
  const consumerSecret = (process.env.PESAPAL_CONSUMER_SECRET || "").trim();
  const fallbackIpnId = (process.env.PESAPAL_IPN_ID || "").trim();
  const paymentsWorkerUrl = (process.env.NEXT_PUBLIC_PAYMENTS_WORKER_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!pesapalUrl || !consumerKey || !consumerSecret) {
    throw new TransactionRecoveryError(
      "Card payment recovery is temporarily unavailable",
      502,
    );
  }

  const amount = toNum(params.tx.amount);
  if (amount <= 0) {
    throw new TransactionRecoveryError("Transaction amount is invalid", 400);
  }

  const authRes = await fetch(`${pesapalUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });
  const authData = (await authRes.json().catch(() => ({}))) as {
    token?: string;
    error?: { message?: string };
  };
  if (!authRes.ok || authData.error || !authData.token) {
    throw new TransactionRecoveryError("Card payment authentication failed", 502);
  }

  const token = authData.token;
  let notificationId = "";
  if (paymentsWorkerUrl && paymentsWorkerUrl.startsWith("https://")) {
    try {
      const ipnRes = await fetch(`${pesapalUrl}/api/URLSetup/RegisterIPN`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: `${paymentsWorkerUrl}/api/payments/webhooks/pesapal`,
          ipn_notification_type: "POST",
        }),
      });
      const ipnData = (await ipnRes.json().catch(() => ({}))) as {
        ipn_id?: string;
      };
      if (ipnRes.ok && typeof ipnData.ipn_id === "string" && ipnData.ipn_id.trim()) {
        notificationId = ipnData.ipn_id.trim();
      }
    } catch {
      // fall back to configured PESAPAL_IPN_ID
    }
  }
  if (!notificationId) notificationId = fallbackIpnId;
  if (!notificationId) {
    throw new TransactionRecoveryError("Card payment notification setup failed", 502);
  }

  const merchantRef = `AGS-CARD-${crypto.randomUUID()}`;
  const creatorHandle =
    toStr(params.tx.creatorHandle) || toStr(params.tx.creatorId) || "creator";
  const email =
    toStr(params.tx.buyerEmail) ||
    toStr(params.tx.attendeeEmail) ||
    params.userEmail ||
    "supporter@agaseke.me";
  const buyerName = toStr(params.tx.buyerName) || toStr(params.tx.attendeeName) || "";
  const parts = buyerName.split(/\s+/).filter(Boolean);
  const firstName = toStr(params.tx.firstName) || parts[0] || "Supporter";
  const lastName =
    toStr(params.tx.lastName) ||
    (parts.length > 1 ? parts.slice(1).join(" ") : "Agaseke");
  const callbackBaseUrl = resolveCallbackBase(params.requestOrigin);

  const payRes = await fetch(`${pesapalUrl}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      id: merchantRef,
      currency: params.currency,
      amount,
      description: describePayment(
        toStr(params.tx.type) || "support",
        creatorHandle,
        toStr(params.tx.productName),
      ),
      callback_url: `${callbackBaseUrl}/payment`,
      notification_id: notificationId,
      billing_address: {
        email_address: email,
        ...(toStr(params.tx.phone) ? { phone_number: toStr(params.tx.phone) } : {}),
        first_name: firstName,
        last_name: lastName,
        country_code: "RW",
      },
    }),
  });

  const payData = (await payRes.json().catch(() => ({}))) as {
    redirect_url?: string;
    order_tracking_id?: string;
    error?: { message?: string };
  };
  if (
    !payRes.ok ||
    payData.error ||
    !payData.redirect_url ||
    !isSafeCheckoutUrl(payData.redirect_url)
  ) {
    throw new TransactionRecoveryError("Card payment link could not be generated", 502);
  }

  return {
    ref: merchantRef,
    redirectUrl: payData.redirect_url,
    orderTrackingId: toStr(payData.order_tracking_id),
  };
}

async function createFreshMomoCheckout(params: {
  amount: number;
  phone: string;
}): Promise<{ ref: string }> {
  const clientId = (process.env.PAYPACK_CLIENT_ID || "").trim();
  const clientSecret = (process.env.PAYPACK_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new TransactionRecoveryError(
      "Mobile Money recovery is temporarily unavailable",
      502,
    );
  }

  const authRes = await fetch(
    "https://payments.paypack.rw/api/auth/agents/authorize",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    },
  );
  if (!authRes.ok) {
    throw new TransactionRecoveryError("Paypack authentication failed", 502);
  }
  const { access } = (await authRes.json()) as { access?: string };
  if (!access) {
    throw new TransactionRecoveryError("Paypack authentication failed", 502);
  }

  const payRes = await fetch("https://payments.paypack.rw/api/transactions/cashin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
      "X-Webhook-Mode": "production",
    },
    body: JSON.stringify({ amount: params.amount, number: params.phone }),
  });
  const payData = (await payRes.json().catch(() => ({}))) as { ref?: string };
  if (!payRes.ok || !payData.ref) {
    throw new TransactionRecoveryError("Payment failed to initiate with Paypack", 502);
  }
  return { ref: payData.ref };
}

export async function recoverUserTransaction(params: {
  uid: string;
  userEmail: string | null;
  ref: string;
  allowPending?: boolean;
  phone?: string;
  requestOrigin?: string | null;
}): Promise<RecoveryResult> {
  const cleanRef = toStr(params.ref).trim();
  if (!cleanRef) {
    throw new TransactionRecoveryError("Transaction reference is required", 400);
  }

  const found = await findTransactionByRef(cleanRef);
  if (!found) {
    throw new TransactionRecoveryError("Transaction not found", 404);
  }

  const { docId, data: tx } = found;
  if (!isTransactionOwner(tx, params.uid, params.userEmail)) {
    throw new TransactionRecoveryError("You can only access your own transactions", 403);
  }
  const owner =
    [tx.supporterId, tx.initiatedBy, tx.buyerId, params.uid].find(isNonEmptyUid) ||
    params.uid;

  const status = resolveEffectiveStatus(tx);
  if (status === "successful" || status === "success" || status === "completed" || status === "paid") {
    throw new TransactionRecoveryError("This transaction already completed", 409);
  }

  if (status === "pending" && !params.allowPending) {
    throw new TransactionRecoveryError(
      "This transaction is still pending. Use resume to complete the payment.",
      409,
    );
  }

  const method = inferMethod(tx);

  if (
    params.allowPending &&
    status === "pending" &&
    method === "card" &&
    isFreshCardRedirectLink(tx)
  ) {
    return {
      ref: toStr(tx.ref) || docId,
      method: "card",
      redirect_url: toStr(tx.redirectUrl),
      merchant_reference: toStr(tx.orderTrackingId || tx.ref || docId),
    };
  }

  const previousRetriedRef = toStr(tx.retriedRef);
  if (previousRetriedRef) {
    const retried = await findTransactionByRef(previousRetriedRef);
    if (retried) {
      const rTx = retried.data;
      const rStatus = resolveEffectiveStatus(rTx);
      if (
        rStatus === "successful" ||
        rStatus === "success" ||
        rStatus === "completed" ||
        rStatus === "paid"
      ) {
        throw new TransactionRecoveryError("This transaction already completed", 409);
      }
      if (
        params.allowPending &&
        rStatus === "pending" &&
        inferMethod(rTx) === "card" &&
        isFreshCardRedirectLink(rTx)
      ) {
        return {
          ref: toStr(rTx.ref) || retried.docId,
          method: "card",
          redirect_url: toStr(rTx.redirectUrl),
          merchant_reference: toStr(rTx.orderTrackingId || rTx.ref || retried.docId),
        };
      }
    }
  }

  const txType = toStr(tx.type) || "support";
  if (txType === "booking" && toStr(tx.bookingId)) {
    const bookingSnap = await adminDb
      .collection("bookingRequests")
      .doc(toStr(tx.bookingId))
      .get();
    if (
      bookingSnap.exists &&
      toStr(bookingSnap.data()?.paymentStatus).toLowerCase() === "paid"
    ) {
      throw new TransactionRecoveryError("This booking has already been paid", 409);
    }
  }
  if (txType === "store" && toStr(tx.orderId)) {
    const orderSnap = await adminDb
      .collection("storeOrders")
      .doc(toStr(tx.orderId))
      .get();
    const orderStatus = toStr(orderSnap.data()?.status).toLowerCase();
    if (
      ["paid", "processing", "shipped", "delivered", "completed"].includes(
        orderStatus,
      )
    ) {
      throw new TransactionRecoveryError("This order has already been paid", 409);
    }
  }

  const currency = resolveHistoricalCurrency(tx);
  const nowIso = new Date().toISOString();
  const nextAttempt = Number(tx.retryCount || 0) + 1;

  if (method === "card") {
    const fresh = await createFreshCardCheckout({
      tx,
      uid: params.uid,
      userEmail: params.userEmail,
      currency,
      requestOrigin: params.requestOrigin,
    });

    const newTx: Record<string, unknown> = {
      ...tx,
      ref: fresh.ref,
      providerRef: fresh.ref,
      orderTrackingId: fresh.orderTrackingId,
      redirectUrl: fresh.redirectUrl,
      redirectUrlGeneratedAt: nowIso,
      status: "pending",
      paymentMethod: "card",
      paymentProvider: "pesapal",
      currency,
      retryOfRef: toStr(tx.ref) || docId,
      supporterId: owner,
      initiatedBy: owner,
      createdAt: nowIso,
      initiatedAt: nowIso,
      updatedAt: nowIso,
    };
    delete newTx.retried;
    delete newTx.retriedAt;
    delete newTx.retriedRef;
    delete newTx.retryCount;

    const batch = adminDb.batch();
    batch.set(adminDb.collection("transactions").doc(fresh.ref), newTx);
    batch.update(adminDb.collection("transactions").doc(docId), {
      retried: true,
      retriedAt: nowIso,
      retriedRef: fresh.ref,
      retryCount: nextAttempt,
      redirectUrl: fresh.redirectUrl,
      redirectUrlGeneratedAt: nowIso,
      updatedAt: nowIso,
    });
    await batch.commit();

    return {
      ref: fresh.ref,
      method: "card",
      redirect_url: fresh.redirectUrl,
      merchant_reference: fresh.orderTrackingId || fresh.ref,
    };
  }

  if (currency !== "RWF") {
    throw new TransactionRecoveryError(
      `Mobile Money only supports RWF (this transaction is ${currency}). Pay by card instead.`,
      400,
    );
  }

  const phone = (params.phone || toStr(tx.phone)).trim();
  if (!phone || phone.length < 9) {
    throw new TransactionRecoveryError(
      "A Mobile Money phone number is required to complete this payment.",
      400,
    );
  }

  const momo = await createFreshMomoCheckout({
    amount: toNum(tx.amount),
    phone,
  });

  const newTx: Record<string, unknown> = {
    ...tx,
    ref: momo.ref,
    providerRef: momo.ref,
    phone,
    status: "pending",
    paymentMethod: "momo",
    paymentProvider: "paypack",
    currency,
    retryOfRef: toStr(tx.ref) || docId,
    supporterId: owner,
    initiatedBy: owner,
    createdAt: nowIso,
    initiatedAt: nowIso,
    updatedAt: nowIso,
  };
  delete newTx.retried;
  delete newTx.retriedAt;
  delete newTx.retriedRef;
  delete newTx.retryCount;

  const batch = adminDb.batch();
  batch.set(adminDb.collection("transactions").doc(momo.ref), newTx);
  batch.update(adminDb.collection("transactions").doc(docId), {
    retried: true,
    retriedAt: nowIso,
    retriedRef: momo.ref,
    retryCount: nextAttempt,
    phone,
    updatedAt: nowIso,
  });
  await batch.commit();

  return {
    ref: momo.ref,
    method: "momo",
    redirect_url: "",
    merchant_reference: momo.ref,
  };
}

export async function cancelUserTransaction(params: {
  uid: string;
  userEmail?: string | null;
  ref: string;
}): Promise<{ ref: string; status: "cancelled" }> {
  const cleanRef = toStr(params.ref).trim();
  if (!cleanRef) {
    throw new TransactionRecoveryError("Transaction reference is required", 400);
  }

  const found = await findTransactionByRef(cleanRef);
  if (!found) {
    throw new TransactionRecoveryError("Transaction not found", 404);
  }

  const { docId, data: tx } = found;
  if (!isTransactionOwner(tx, params.uid, params.userEmail)) {
    throw new TransactionRecoveryError("You can only cancel your own transactions", 403);
  }

  const status = toStr(tx.status).toLowerCase() || "pending";
  if (["successful", "success", "completed", "paid"].includes(status)) {
    throw new TransactionRecoveryError("Completed transactions cannot be cancelled", 409);
  }

  const resolvedRef = toStr(tx.ref) || docId;
  if (status === "cancelled" || status === "canceled") {
    return { ref: resolvedRef, status: "cancelled" };
  }

  const nowIso = new Date().toISOString();
  await adminDb.collection("transactions").doc(docId).update({
    status: "cancelled",
    cancelledAt: nowIso,
    cancelledBy: "user",
    updatedAt: nowIso,
  });

  const retriedRef = toStr(tx.retriedRef);
  if (retriedRef && retriedRef !== resolvedRef) {
    const retried = await findTransactionByRef(retriedRef);
    if (retried) {
      const rStatus = toStr(retried.data.status).toLowerCase() || "pending";
      if (rStatus === "pending" || rStatus === "stalled") {
        await adminDb.collection("transactions").doc(retried.docId).update({
          status: "cancelled",
          cancelledAt: nowIso,
          cancelledBy: "user",
          updatedAt: nowIso,
        });
      }
    }
  }

  return { ref: resolvedRef, status: "cancelled" };
}
