import { db } from "@/db/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { t } from "@/lib/i18n";
import type { Creator } from "@/types/creator";
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
import {
  normalizePayoutCurrency,
  pendingPayoutField,
  totalEarningsField,
} from "@/lib/payouts/currency";
import { buildPayoutOverview, type CurrencyBalance } from "@/lib/payouts/overview";
import type { CreatorHomeSupport } from "./types";

export interface CreatorHomeStats {
  pending: number;
  totalEarnings: number;
  supporters: number;
  currency: string;
  perCurrencyBalances: CurrencyBalance[];
  hasPayout: boolean;
}

export interface CreatorHomeData {
  stats: CreatorHomeStats;
  supports: CreatorHomeSupport[];
}

export async function fetchCreatorHomeData(creator: Creator): Promise<CreatorHomeData> {
  const [creatorSnap, currenciesSnap] = await Promise.all([
    getDocs(query(collection(db, "creators"), where("uid", "==", creator.uid))),
    getDocs(collection(db, "currencies")).catch(() => null),
  ]);
  const creatorDoc = creatorSnap.docs[0];
  const creatorData = (creatorDoc?.data() as Record<string, unknown> | undefined) ?? {
    ...(creator as unknown as Record<string, unknown>),
  };
  const creatorCurrency = normalizePayoutCurrency(creatorData?.currency);
  const currency = creatorCurrency ?? "RWF";
  const creatorDocId = creatorDoc?.id || creator.uid;

  const policies =
    currenciesSnap?.docs.map(
      (d) => d.data() as { code?: unknown; payoutThreshold?: unknown },
    ) ?? [];
  const overview = buildPayoutOverview(creatorData, policies);
  const activeBalances = overview.perCurrencyBalances.filter(
    (b) => b.pending > 0 || b.earnings > 0 || b.currency === currency,
  );

  const supportsSnap = await getDocs(
    query(
      collection(db, "supportedCreators"),
      where("creatorId", "==", creatorDocId),
      orderBy("createdAt", "desc"),
      limit(10),
    ),
  );

  const supports: CreatorHomeSupport[] = supportsSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name:
        (data.supporterName as string) ||
        (data.anonymous ? t("creatorHome.anonymous") : t("creatorHome.aSupporter")),
      amount: typeof data.amount === "number" ? data.amount : 0,
      // Never override an explicit currency (e.g. USD) and never infer from
      // creator.currency; missing pre-Dec-2026 records resolve to RWF.
      currency: resolveHistoricalCurrency(data),
      createdAt: data.createdAt,
      anonymous: Boolean(data.anonymous),
    };
  });

  const stats: CreatorHomeStats = {
    pending: Number(creatorData?.[pendingPayoutField(currency)] ?? 0),
    totalEarnings: Number(creatorData?.[totalEarningsField(currency)] ?? 0),
    supporters: Number(creatorData?.totalSupporters ?? 0),
    currency,
    perCurrencyBalances: activeBalances.length > 0 ? activeBalances : overview.perCurrencyBalances,
    hasPayout: Boolean(creatorData?.lastPayoutAt),
  };

  return { stats, supports };
}
