import type { Env, TierData } from "../types";
import { firestoreGet, firestoreSet, convertToFields, convertFromFields } from "../firestore";

export async function getTiers(
  env: Env,
  creatorHandle: string
): Promise<{ tiers: TierData[]; enabled: boolean }> {
  const doc = await firestoreGet(env, `creators/${creatorHandle}`);
  if (!doc) return { tiers: [], enabled: false };

  const fields = doc.fields as Record<string, unknown> | undefined;
  if (!fields) return { tiers: [], enabled: false };

  const data = convertFromFields(fields);
  const communityEnabled = !!data.communityEnabled;
  const tiers = (data.communityTiers as Array<Record<string, unknown>> || [])
    .filter((t: any) => t.isActive !== false)
    .map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || "",
      price: Number(t.price) || 0,
      priceUSD: t.priceUSD ? Number(t.priceUSD) : undefined,
      currency: t.currency || "RWF",
      interval: t.interval || "monthly",
      benefits: Array.isArray(t.benefits) ? t.benefits : [],
      isActive: t.isActive !== false,
    }));

  return { tiers, enabled: communityEnabled };
}

export async function saveTiers(
  env: Env,
  creatorHandle: string,
  tiers: TierData[],
  enabled: boolean
): Promise<void> {
  if (tiers.length > 2) {
    throw new Error("Maximum of 2 community tiers allowed");
  }

  const doc = await firestoreGet(env, `creators/${creatorHandle}`);
  const fields = doc?.fields ? convertFromFields(doc.fields as Record<string, unknown>) : {};

  const updated = {
    ...fields,
    communityEnabled: enabled,
    communityTiers: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      priceUSD: t.currency === "USD" ? t.priceUSD : null,
      currency: t.currency || "RWF",
      interval: t.interval,
      benefits: t.benefits,
      isActive: t.isActive,
    })),
  };

  await firestoreSet(env, `creators/${creatorHandle}`, convertToFields(updated));
}
