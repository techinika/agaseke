/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";

export type GiveawayType = "random" | "challenge";
export type GiveawayAccess = "public" | "supporters" | "tier";
export type GiveawayStatus = "draft" | "active" | "ended" | "completed";
export type RewardType = "cash" | "merchandise" | "discount" | "service" | "other";

export interface GiveawayReward {
  id: string;
  type: RewardType;
  title: string;
  description: string;
  value: number;
  quantity: number;
  partnerId?: string;
}

export interface GiveawayPartner {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
}

export interface GiveawayChallenge {
  type: "follow" | "share" | "comment" | "tag" | "custom";
  description: string;
  completed: boolean;
  link?: string;
}

export interface GiveawayWinner {
  winnerId: string;
  winnerName: string;
  winnerPhoto?: string;
  winnerEmail?: string;
  rewardId: string;
  rewardTitle: string;
  wonAt: Timestamp | Date;
}

export interface GiveawayEntry {
  id: string;
  giveawayId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhoto?: string;
  challengeCompleted: boolean;
  challengeProof?: string;
  enteredAt: Timestamp | Date;
}

export interface Giveaway {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  type: GiveawayType;
  access: GiveawayAccess;
  minSupportAmount?: number;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  maxWinners: number;
  rewards: GiveawayReward[];
  challenge?: GiveawayChallenge;
  partners: GiveawayPartner[];
  status: GiveawayStatus;
  winners: GiveawayWinner[];
  participantCount: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
