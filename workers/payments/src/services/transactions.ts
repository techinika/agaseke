import type { Env } from "../types";
import { firestoreQueryAll, firestoreGet, convertFromFields } from "../firestore";

export interface UserTransaction {
  ref: string;
  type: string;
  status: string;
  currency: string;
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
}

const MAX_TRANSACTIONS = 100;

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value as string);
  return Number.isFinite(n) ? n : 0;
}

function toString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export async function getUserTransactions(env: Env, uid: string): Promise<UserTransaction[]> {
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

  return raw.slice(0, MAX_TRANSACTIONS).map((t) => {
    const creatorUid = toString(t.creatorUid);
    return {
      ref: toString(t.ref),
      type: toString(t.type) || "support",
      status: toString(t.status) || "pending",
      currency: toString(t.currency) || "RWF",
      paymentMethod: toString(t.paymentMethod) || (toString(t.type) === "gathering" ? "momo" : ""),
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
    };
  });
}