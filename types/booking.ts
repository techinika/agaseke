/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";

export type BookingAccess = "public" | "supporters";
export type BookingType = "physical" | "online" | "both";
export type BookingStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export interface BookingTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface BookingSpecificDate {
  id: string;
  date: string;
  slots: BookingTimeSlot[];
}

export interface BookingAvailability {
  daysOfWeek: number[];
  bookingType: BookingType;
  startDate: string;
  endDate: string;
  defaultSlots: BookingTimeSlot[];
  specificDates?: BookingSpecificDate[];
  location?: string;
  onlineLink?: string;
}

export interface BookingTier {
  id: string;
  name: string;
  description: string;
  purpose: string;
  price: number;
  duration: number;
  access: BookingAccess;
  offers: string[];
  availability: BookingAvailability;
  active: boolean;
}

export interface BookingRequest {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  bookerId?: string;
  bookerName: string;
  bookerEmail: string;
  bookerPhone: string;
  reason: string;
  preferredType: BookingType;
  preferredDate: string;
  preferredTime: string;
  meetingLocation?: string;
  status: BookingStatus;
  tierId?: string;
  tierName?: string;
  tierDuration?: number;
  paymentAmount?: number;
  paymentStatus?: "none" | "pending" | "paid" | "failed";
  txRef?: string;
  createdAt: Timestamp | Date;
  respondedAt?: Timestamp | Date;
  responseNote?: string;
}

export interface BookingSettings {
  enabled: boolean;
  access: BookingAccess;
  mode: "simple" | "tiered";
  availability?: BookingAvailability;
  tiers?: BookingTier[];
}
