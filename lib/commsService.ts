import { auth } from "@/db/firebase";

export type EmailPurpose =
  | "welcome_user" | "welcome_creator" | "profile_live" | "booking_request" | "booking_response"
  | "gathering_created" | "gathering_rsvp" | "gathering_checkin" | "gathering_declined"
  | "gathering_undo" | "message_new" | "message_digest" | "store_order" | "store_status"
  | "support_received" | "payout_processed" | "content_new" | "verification_request"
  | "verification_feedback" | "broadcast";

export interface CommsResponse {
  success: boolean;
  messageId?: string;
  purpose: EmailPurpose;
  recipientCount: number;
}

export const COMMS_WORKER_URL =
  process.env.NEXT_PUBLIC_COMMS_WORKER_URL || "http://localhost:8787";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function sendCommsEmail(
  purpose: EmailPurpose,
  data: Record<string, unknown>,
): Promise<CommsResponse> {
  const headers = await getAuthHeaders();

  const res = await fetch(COMMS_WORKER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ purpose, data }),
  });

  if (!res.ok) {
    let errorMessage = "Failed to send email";
    try {
      const errData = await res.json();
      errorMessage = errData.error || `Failed to send email (${res.status})`;
    } catch {
      errorMessage = "Failed to send email";
    }
    throw new Error(errorMessage);
  }

  return res.json();
}
