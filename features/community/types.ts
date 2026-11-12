export interface CommunityTierView {
  id: string;
  name: string;
  description: string;
  price: number;
  priceUSD?: number;
  currency?: string;
  interval: "monthly" | "yearly";
  benefits: string[];
  isActive?: boolean;
  memberCount?: number;
}
