import type { PriceMap } from "@/lib/priceMap";

export interface CommunityTierView {
  id: string;
  name: string;
  description: string;
  price: number;

  prices?: PriceMap;
  currency?: string;
  interval: "monthly" | "yearly";
  benefits: string[];
  isActive?: boolean;
  memberCount?: number;
}
