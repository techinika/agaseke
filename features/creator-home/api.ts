import { db } from "@/db/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { t } from "@/lib/i18n";
import type { Creator } from "@/types/creator";
import type { CreatorHomeSupport } from "./types";

export interface CreatorHomeStats {
  pending: number;
  totalEarnings: number;
  supporters: number;
  currency: string;
  hasPayout: boolean;
}

export interface CreatorHomeData {
  stats: CreatorHomeStats;
  supports: CreatorHomeSupport[];
}

export async function fetchCreatorHomeData(creator: Creator): Promise<CreatorHomeData> {
  const creatorSnap = await getDocs(
    query(collection(db, "creators"), where("uid", "==", creator.uid)),
  );
  const creatorDoc = creatorSnap.docs[0];
  const creatorData = creatorDoc?.data() as Record<string, unknown> | undefined;
  const currency = (creatorData?.currency as string) || "RWF";
  const creatorDocId = creatorDoc?.id || creator.uid;

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
      currency: (data.currency as string) || currency,
      createdAt: data.createdAt,
      anonymous: Boolean(data.anonymous),
    };
  });

  const stats: CreatorHomeStats = {
    pending: (creatorData?.pendingPayout as number) ?? 0,
    totalEarnings: (creatorData?.totalEarnings as number) ?? 0,
    supporters: (creatorData?.totalSupporters as number) ?? 0,
    currency,
    hasPayout: Boolean(creatorData?.lastPayoutAt),
  };

  return { stats, supports };
}
