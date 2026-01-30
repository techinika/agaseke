/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Creator {
  id: string;
  uid: string;
  createdAt: any;
  username: string;
  bio?: string;
  website?: string;
  verified: boolean;
  network: string;
  payoutNumber: string;
  name: string;
  location?: string;
  handle: string;
  bannerURL?: string;
  photoURL?: string;
  totalEarnings: number;
  totalSupporters: number;
  pendingPayout: number;
  socials: {
    instagram: string | null;
    twitter: string | null;
    youtube: string | null;
    tiktok: string | null;
    web: string | null;
  };
  perks: Array<any>;
  events: Array<any>;
  views: number;
  lastPayoutAt?: any;
}
