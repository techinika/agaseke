/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";

export type BookingAccess = "public" | "supporters";
export type BookingType = "physical" | "online" | "both";
export type BookingStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export interface BookingTimeSlot {
  id: string;
  startTime: string; // "09:00"
  endTime: string; // "10:00"
}

export interface BookingSpecificDate {
  id: string;
  date: string; // "2024-03-15"
  slots: BookingTimeSlot[];
}

export interface BookingAvailability {
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  bookingType: BookingType; // physical, online, or both
  startDate: string; // "2024-03-01"
  endDate: string; // "2024-03-31"
  defaultSlots: BookingTimeSlot[];
  specificDates?: BookingSpecificDate[];
  location?: string; // For physical meetings
  onlineLink?: string; // For online meetings
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
  status: BookingStatus;
  createdAt: Timestamp | Date;
  respondedAt?: Timestamp | Date;
  responseNote?: string;
}

export interface BookingSettings {
  enabled: boolean;
  access: BookingAccess;
  availability?: BookingAvailability;
}
