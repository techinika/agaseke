import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  normalizePayoutCurrency,
  pendingPayoutField,
  totalEarningsField,
  type PayoutCurrency,
} from "@/lib/payouts/currency";
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";

export interface CreatorDashboardBalance {
  currency: string;
  pending: number;
}

export interface CreatorDashboardData {
  creatorCurrency: string;
  perCurrencyPayouts: CreatorDashboardBalance[];
  recentSupport: Array<Record<string, unknown>>;
  history: Array<{
    id: string;
    type: "Content" | "Gathering";
    title: string;
    createdAt?: Date;
    meta: string;
  }>;
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const d = (value as { toDate?: () => Date }).toDate;
    if (typeof d === "function") return d.call(value);
  }
  return undefined;
}

export async function fetchCreatorDashboardData(creator: {
  uid?: string;
  handle?: string;
  pendingPayout?: number;
  [key: string]: unknown;
}): Promise<CreatorDashboardData> {
  const creatorSnap = await getDocs(
    query(collection(db, "creators"), where("uid", "==", creator?.uid)),
  );
  const creatorDoc = creatorSnap.docs[0];
  const cid = creatorDoc?.id;
  const creatorData = creatorDoc?.data() as Record<string, unknown> | undefined;
  const source = (creatorData ?? creator) as Record<string, unknown>;
  const mainCurrency = normalizePayoutCurrency(source.currency);

  let supports: Array<Record<string, unknown>> = [];
  if (cid) {
    const supportSnap = await getDocs(
      query(
        collection(db, "supportedCreators"),
        where("creatorId", "==", cid),
        orderBy("createdAt", "desc"),
        limit(10),
      ),
    );
    supports = supportSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        ...data,
        currency: resolveHistoricalCurrency(data),
      };
    });
  }

  const selectedCurrency = mainCurrency ?? "RWF";
  const getPending = (code: PayoutCurrency) =>
    Number(source[pendingPayoutField(code)] ?? 0);
  const getEarnings = (code: PayoutCurrency) =>
    Number(source[totalEarningsField(code)] ?? 0);
  const held =
    source.pendingWithdrawals && typeof source.pendingWithdrawals === "object"
      ? (source.pendingWithdrawals as Record<string, unknown>)
      : {};

  const candidateCodes = new Set<PayoutCurrency>([selectedCurrency]);
  for (const key of Object.keys(source)) {
    const match =
      key.match(/^pendingPayout([A-Z]{3})$/) || key.match(/^totalEarnings([A-Z]{3})$/);
    const code = normalizePayoutCurrency(match?.[1]);
    if (code) candidateCodes.add(code);
  }
  for (const key of Object.keys(held)) {
    const code = normalizePayoutCurrency(key);
    if (code) candidateCodes.add(code);
  }
  if (source.pendingPayout !== undefined || source.totalEarnings !== undefined) {
    candidateCodes.add("RWF");
  }

  const displayedCodes = Array.from(candidateCodes).filter((code) => {
    if (code === selectedCurrency) return true;
    return (
      getPending(code) > 0 ||
      getEarnings(code) > 0 ||
      Number(held[code] ?? 0) > 0
    );
  });

  const perCurrencyPayouts = displayedCodes.map((code) => ({
    currency: code,
    pending: getPending(code),
  }));

  const contentQ = query(
    collection(db, "creatorContent"),
    where("creatorId", "==", creator?.handle),
    orderBy("createdAt", "desc"),
    limit(5),
  );
  const gatheringQ = query(
    collection(db, "creatorGatherings"),
    where("creatorId", "==", creator?.uid),
    orderBy("createdAt", "desc"),
    limit(5),
  );

  const [contentSnap, gatheringSnap] = await Promise.all([
    getDocs(contentQ),
    getDocs(gatheringQ),
  ]);

  const contentItems = contentSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      type: "Content" as const,
      title: String(data.title || ""),
      createdAt: asDate(data.createdAt),
      meta: `${Number(data.views || 0)} views`,
    };
  });

  const gatheringItems = gatheringSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      type: "Gathering" as const,
      title: String(data.title || ""),
      createdAt: asDate(data.createdAt),
      meta: String(data.location || "Online"),
    };
  });

  const history = [...contentItems, ...gatheringItems].sort(
    (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
  );

  return {
    creatorCurrency: mainCurrency ?? "RWF",
    perCurrencyPayouts,
    recentSupport: supports,
    history,
  };
}
