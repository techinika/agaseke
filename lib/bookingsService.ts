import { auth } from "@/db/firebase";

export const BOOKINGS_WORKER_URL =
  process.env.NEXT_PUBLIC_BOOKINGS_WORKER_URL || "http://localhost:8788";

export interface CreateBookingRequest {
  creatorHandle: string;
  bookerId?: string | null;
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  reason?: string;
  preferredDate: string;
  preferredTime: string;
  preferredType?: string;
  tierId?: string | null;
  tierName?: string | null;
  paymentAmount?: number;
  currency?: string;
}

export interface CreateBookingResponse {
  success: boolean;
  bookingId: string;
  paymentRequired: boolean;
  amount: number;
  txRef: string | null;
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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function createBooking(
  data: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${BOOKINGS_WORKER_URL}/api/bookings/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorMessage = "Failed to create booking";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function respondToBooking(
  data: RespondBookingRequest,
): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${BOOKINGS_WORKER_URL}/api/bookings/respond`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorMessage = "Failed to respond to booking";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
}

export async function checkAvailability(
  data: AvailabilityRequest,
): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${BOOKINGS_WORKER_URL}/api/bookings/availability`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorMessage = "Failed to check availability";
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return res.json();
}
