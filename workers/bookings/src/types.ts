export interface BookingTier {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  availability: BookingAvailability;
}

export interface BookingAvailability {
  daysOfWeek: number[];
  startDate?: string;
  endDate?: string;
  defaultSlots: Array<{ startTime: string; endTime: string }>;
  onlineLink?: string;
  location?: string;
}

export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  APP_URL: string;
  COMMS_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
}

export interface CreateBookingRequest {
  creatorHandle: string;
  bookerId?: string;
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  reason?: string;
  preferredDate: string;
  preferredTime: string;
  preferredType?: string;
  tierId?: string;
  tierName?: string;
  paymentAmount?: number;
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

export interface BookingDocument {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorUid?: string;
  creatorEmail?: string;
  bookerId?: string | null;
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  reason?: string;
  preferredDate: string;
  preferredTime: string;
  preferredType: string;
  meetingLocation?: string | null;
  status: string;
  tierId?: string | null;
  tierName?: string | null;
  tierDuration?: number | null;
  paymentAmount: number;
  paymentStatus: string;
  txRef?: string | null;
  createdAt: string;
}
