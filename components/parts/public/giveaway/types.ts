/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";

export interface Giveaway {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  type: "random" | "challenge";
  access: "public" | "supporters" | "tier";
  minSupportAmount?: number;
  maxWinners: number;
  endDate: Timestamp | Date;
  rewards: GiveawayReward[];
  winners: GiveawayWinner[];
  partners: GiveawayPartner[];
  createdAt: Timestamp | Date;
}

export interface GiveawayReward {
  title: string;
  type: "cash" | "merchandise" | "discount" | "service" | "other";
  quantity: number;
}

export interface GiveawayWinner {
  winnerId: string;
  winnerName: string;
  winnerPhoto?: string;
  rewardTitle: string;
}

export interface GiveawayPartner {
  id: string;
  name: string;
  logo?: string;
}

export interface GiveawayEntry {
  id: string;
  giveawayId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhoto?: string;
  challengeCompleted: boolean;
  enteredAt: Date;
}
