import type { CommunityTierView } from "@/features/community/types";

export interface CreatorPageSocials {
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  web?: string | null;
}

export interface CreatorPageCreator {
  uid: string;
  name?: string;
  handle?: string;
  bio?: string;
  profilePicture?: string | null;
  bannerURL?: string | null;
  verified?: boolean;
  currency?: string;
  socials?: CreatorPageSocials;
  events?: unknown[];
  messagingEnabled?: boolean;
  messagingAllowAll?: boolean;
  messagingMinAmount?: number;
  storeEnabled?: boolean;
  storePublic?: boolean;
  giveawayEnabled?: boolean;
  gatheringsEnabled?: boolean;
  communityEnabled?: boolean;
  communityTiers?: CommunityTierView[];
  bookingEnabled?: boolean;
}

export interface CreatorPageProfile {
  displayName?: string | null;
  photoURL?: string | null;
  referralCreator?: string | null;
  totalSupport?: number;
}

export interface CreatorPagePost {
  id: string;
  creatorId?: string;
  isPrivate?: boolean;
  status?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
  [key: string]: unknown;
}

export interface CreatorPagePartner {
  id: string;
  name?: string;
  description?: string;
  logo?: string | null;
  website?: string | null;
}

export interface CreatorPageInitialData {
  creator?: CreatorPageCreator | null;
  profile?: CreatorPageProfile | null;
  partners?: CreatorPagePartner[];
  publicPosts?: CreatorPagePost[];
  referralId?: string | null;
}
