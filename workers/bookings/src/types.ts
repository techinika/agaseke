export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  INTERNAL_AUTH_SECRET: string;
  MONEY_LEDGER_ENABLED?: string;
  PAYMENTS_QUEUE: Queue;
}

export interface BookingTier {
  id: string;
  name: string;
  description: string;
  purpose: string;
  price: number;
  prices?: Record<string, number>;
  currency?: string;
  duration: number;
  access: "public" | "supporters";
  offers: string[];
  availability: BookingAvailability;
  active: boolean;
}

export interface BookingAvailability {
  daysOfWeek: number[];
  bookingType: "online" | "physical" | "both";
  onlineLink?: string;
  location?: string;
  startDate: string;
  endDate: string;
  defaultSlots: TimeSlot[];
  dayOverrides?: Record<string, DayOverride>;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DayOverride {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface CreateBookingRequest {
  creatorHandle: string;
  bookerId: string | null;
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  reason?: string;
  preferredDate: string;
  preferredTime: string;
  preferredType?: "online" | "physical";
  tierId?: string | null;
  tierName?: string | null;
  paymentAmount?: number;
  currency?: string;
}

export interface RespondBookingRequest {
  bookingId: string;
  action: "accepted" | "declined";
  rescheduleDate?: string;
  rescheduleTime?: string;
  message?: string;
}

export interface AvailabilityRequest {
  creatorHandle: string;
  date?: string;
}

export interface CallbackPayload {
  txData: Record<string, unknown>;
  totalAmount: number;
  paymentRef: string;
  paymentMethod: "momo" | "card";
  platformShare?: number;
  creatorShare?: number;
  referralShare?: number;
}

export interface DecodedToken {
  uid: string;
  email?: string;
  [key: string]: unknown;
}
