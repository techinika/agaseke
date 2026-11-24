import type { Env } from "./types";

export interface RevenueSplit {
  platformShare: number;
  creatorShare: number;
  referralShare: number;
}

export function calculateRevenue(
  totalAmount: number,
  includeReferral: boolean,
  env: Env
): RevenueSplit {
  const platformSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL || 0.09)
    : Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.1);
  const creatorSharePercentage = Number(env.NEXT_PUBLIC_CREATOR_SHARE || 0.9);
  const referralSharePercentage = Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01);

  return {
    platformShare: totalAmount * platformSharePercentage,
    creatorShare: totalAmount * creatorSharePercentage,
    referralShare: includeReferral ? totalAmount * referralSharePercentage : 0,
  };
}

export function calculateStoreRevenue(
  productTotal: number,
  platformFeePayer: string,
  env: Env,
  includeReferral = false,
): {
  platformFee: number;
  creatorEarnings: number;
  referralEarnings: number;
  totalAmount: number;
} {
  const platformSharePercentage = Number(env.NEXT_PUBLIC_PLATFORM_SHARE || 0.1);
  const referralSharePercentage = includeReferral
    ? Number(env.NEXT_PUBLIC_REFERRAL_SHARE || 0.01)
    : 0;

  const platformFee = productTotal * platformSharePercentage;
  const referralEarnings = productTotal * referralSharePercentage;
  const feePayer = platformFeePayer || "buyer";

  let totalAmount = productTotal;
  let creatorEarnings = 0;

  if (feePayer === "buyer") {
    totalAmount = productTotal + platformFee;
    creatorEarnings = productTotal - referralEarnings;
  } else {
    creatorEarnings = productTotal - platformFee - referralEarnings;
  }

  return { platformFee, creatorEarnings, referralEarnings, totalAmount };
}
