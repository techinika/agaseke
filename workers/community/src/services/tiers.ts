import type { Env, TierData } from "../types";
import { firestoreGet, firestoreSet, convertToFields, convertFromFields } from "../firestore";
import { getCurrencyDefinition, isCurrencyCode } from "../money/registry.generated";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasSupportedPrecision(value: number, currency: string): boolean {
  if (!isCurrencyCode(currency)) return false;
  const factor = 10 ** getCurrencyDefinition(currency).minorUnit;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

function sanitizePrices(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const prices: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const currency = code.toUpperCase();
    if (!isCurrencyCode(currency)) continue;
    const amount = num(value);
    if (amount > 0 && hasSupportedPrecision(amount, currency)) {
      prices[currency] = amount;
    }
  }
  return prices;
}

function primaryAmount(tier: TierData, prices: Record<string, number>): number {
  const currency = typeof tier.currency === "string" ? tier.currency.toUpperCase() : "";
  if (currency) {
    if (prices[currency] != null) return prices[currency];
    return num(tier.price);
  }
  if (Object.keys(prices).length === 0) {
    return num(tier.price);
  }
  const first = Object.values(prices)[0];
  return typeof first === "number" ? first : 0;
}

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
  const tiers = ((data.communityTiers as Array<Record<string, unknown>>) || [])
    .filter((t) => t.isActive !== false)
    .map((t) => {
      const prices = sanitizePrices(t.prices);
      const currency = typeof t.currency === "string" ? t.currency.toUpperCase() : undefined;
      const price =
        currency && prices[currency] != null
          ? prices[currency]
          : currency && Object.keys(prices).length > 0
            ? 0
            : num(t.price);
      return {
        id: String(t.id || ""),
        name: String(t.name || ""),
        description: String(t.description || ""),
        price,
        prices,
        currency,
        interval: (t.interval === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly",
        benefits: Array.isArray(t.benefits) ? t.benefits.map((b: unknown) => String(b)) : [],
        isActive: t.isActive !== false,
      } satisfies TierData;
    });

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
    communityTiers: tiers.map((t) => {
      const prices = sanitizePrices(t.prices);
      const currency = t.currency && isCurrencyCode(t.currency.toUpperCase())
        ? t.currency.toUpperCase()
        : undefined;
      const normalizedTier = currency ? { ...t, currency } : t;
      const price = primaryAmount(normalizedTier, prices);
      return {
        id: t.id,
        name: t.name,
        description: t.description || "",
        price,
        prices,
        currency: currency ?? null,
        interval: t.interval,
        benefits: t.benefits || [],
        isActive: t.isActive !== false,
      };
    }),
  };

  await firestoreSet(env, `creators/${creatorHandle}`, convertToFields(updated));
}
