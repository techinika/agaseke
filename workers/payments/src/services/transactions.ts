import type { Env } from "../types";
import { firestoreQueryAll, firestoreGet, convertFromFields } from "../firestore";

export interface UserTransaction {
  ref: string;
  type: string;
  status: string;
  currency: string;
  sourceCurrency: string;
  sourceAmountMinor: number;
  fxRate: number;
  paymentMethod: string;
  amount: number;
  createdAt: string;
  successfulAt: string;
  message: string;
  creatorId: string;
  creatorUid: string;
  creatorName: string;
  productId: string;
  productName: string;
  quantity: number;
  selectedSize: string;
  bookingId: string;
  gatheringId: string;
  attendeeName: string;
  communityTierId: string;
  communityInterval: string;
  communitySubscriptionId: string;
  redirectUrl: string;
  redirectUrlGeneratedAt: string;
  phone: string;
}

const MAX_TRANSACTIONS = 100;

export interface TransactionsPage {
  transactions: UserTransaction[];
  total: number;
  counts: Record<string, number>;
  limit: number;
  offset: number;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value as string);
  return Number.isFinite(n) ? n : 0;
}

const PRE_MULTI_CURRENCY_CUTOFF_MS = Date.parse("2026-12-01T00:00:00.000Z");

function resolveTxCurrency(t: Record<string, unknown>): string {
  const explicit = toString(t.currency).trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(explicit)) return explicit;
  const rawDate = toString(t.createdAt) || toString(t.successfulAt);
  if (!rawDate) return "RWF";
  const ms = Date.parse(rawDate);
  if (!Number.isFinite(ms) || ms < PRE_MULTI_CURRENCY_CUTOFF_MS) return "RWF";
  return "";
}

function toString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export async function getUserTransactions(
  env: Env,
  uid: string,
  limit = 20,
  offset = 0
): Promise<TransactionsPage> {
  const [bySupporter, byInitiator] = await Promise.all([
    firestoreQueryAll(env, "transactions", "supporterId", { stringValue: uid }),
    firestoreQueryAll(env, "transactions", "initiatedBy", { stringValue: uid }),
  ]);

  const seen = new Set<string>();
  const raw: Array<Record<string, unknown>> = [];

  for (const doc of [...bySupporter, ...byInitiator]) {
    const data = convertFromFields(doc.fields);
    const ref = toString(data.ref);
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    raw.push(data);
  }

  raw.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const clampedLimit = Math.max(1, Math.min(limit, 50));
  const clampedOffset = Math.max(0, offset);

  const counts: Record<string, number> = {
    all: raw.length,
    successful: 0,
    pending: 0,
    failed: 0,
  };
  for (const t of raw) {
    const status = toString(t.status);
    if (counts[status] !== undefined) counts[status] += 1;
  }

  const page = raw.slice(clampedOffset, clampedOffset + clampedLimit).slice(0, MAX_TRANSACTIONS);

  const distinctCreatorUids = [...new Set(raw.map((t) => toString(t.creatorUid)).filter(Boolean))];
  const nameByUid: Record<string, string> = {};
  await Promise.all(
    distinctCreatorUids.map(async (creatorUid) => {
      const profileDoc = await firestoreGet(env, `profiles/${creatorUid}`);
      if (profileDoc && profileDoc.fields) {
        const profile = convertFromFields(profileDoc.fields as Record<string, unknown>);
        const displayName = toString(profile.displayName);
        if (displayName) nameByUid[creatorUid] = displayName;
      }
    })
  );

  const transactions = page.map((t) => {
    const creatorUid = toString(t.creatorUid);
    const ref = toString(t.ref);
    const explicitMethod = toString(t.paymentMethod);
    const inferredMethod =
      explicitMethod ||
      (toString(t.paymentProvider) === "pesapal" ||
      ref.startsWith("AGS-CARD-") ||
      Boolean(toString(t.redirectUrl))
        ? "card"
        : toString(t.type) === "gathering"
          ? "momo"
          : "");
    return {
      ref,
      type: toString(t.type) || "support",
      status: toString(t.status) || "pending",
      currency: resolveTxCurrency(t),
      sourceCurrency: toString(t.sourceCurrency),
      sourceAmountMinor: toNumber(t.sourceAmountMinor),
      fxRate: toNumber(t.fxRate),
      paymentMethod: inferredMethod,
      amount: toNumber(t.amount),
      createdAt: toString(t.createdAt),
      successfulAt: toString(t.successfulAt),
      message: toString(t.message),
      creatorId: toString(t.creatorId),
      creatorUid,
      creatorName: nameByUid[creatorUid] || "",
      productId: toString(t.productId),
      productName: toString(t.productName),
      quantity: toNumber(t.quantity),
      selectedSize: toString(t.selectedSize),
      bookingId: toString(t.bookingId),
      gatheringId: toString(t.gatheringId),
      attendeeName: toString(t.attendeeName),
      communityTierId: toString(t.communityTierId),
      communityInterval: toString(t.communityInterval),
      communitySubscriptionId: toString(t.communitySubscriptionId),
      redirectUrl: toString(t.redirectUrl),
      redirectUrlGeneratedAt: toString(t.redirectUrlGeneratedAt),
      phone: toString(t.phone),
    };
  });

  return {
    transactions,
    total: raw.length,
    counts,
    limit: clampedLimit,
    offset: clampedOffset,
  };
}