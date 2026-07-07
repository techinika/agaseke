import type { Env, RespondBookingRequest } from "../types";
import { firestoreGet, firestorePatch, extractFirestoreDocument } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";

export async function respondToBooking(
  env: Env,
  body: RespondBookingRequest,
  auth: { uid: string; email: string | null }
): Promise<{ success: boolean; error?: string }> {
  const { bookingId, action, rescheduleDate, rescheduleTime, message } = body;

  if (!bookingId || !action) {
    return { success: false, error: "Missing required fields" };
  }

  if (action !== "accepted" && action !== "declined") {
    return { success: false, error: "Invalid action. Use 'accepted' or 'declined'" };
  }

  const doc = await firestoreGet(env, `bookingRequests/${bookingId}`);
  if (!doc) {
    return { success: false, error: "Booking not found" };
  }

  const fields = (doc as { fields?: Record<string, unknown> }).fields;
  if (!fields) {
    return { success: false, error: "Booking not found" };
  }

  const data = extractFirestoreDocument(fields);
  const creatorUid = String(data.creatorUid || "");

  if (!creatorUid || creatorUid !== auth.uid) {
    return { success: false, error: "Unauthorized to respond to this booking" };
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = {
    status: { stringValue: action },
    respondedAt: { timestampValue: now },
  };

  if (message) {
    updateFields.responseNote = { stringValue: message.slice(0, 2000) };
  }

  if (rescheduleDate) {
    updateFields.rescheduleDate = { stringValue: rescheduleDate };
  }

  if (rescheduleTime) {
    updateFields.rescheduleTime = { stringValue: rescheduleTime };
  }

  const updateResult = await firestorePatch(env, `bookingRequests/${bookingId}`, updateFields);
  if (!updateResult) {
    return { success: false, error: "Failed to update booking" };
  }

  const bookerId = String(data.bookerId || "");
  const creatorName = String(data.creatorName || "Creator");
  const bookerEmail = String(data.bookerEmail || "");

  if (bookerId) {
    await createNotification(env, {
      userId: bookerId,
      type: "booking_response",
      title: action === "accepted" ? "Booking Accepted" : "Booking Declined",
      message:
        action === "accepted"
          ? `${creatorName} has accepted your booking request.`
          : `${creatorName} has declined your booking request.${message ? ` Reason: ${message}` : ""}`,
      link: "/bookings",
      actorName: creatorName,
      metadata: { bookingId },
    });
  }

  await logActivity(env, "info", "booking", `Booking ${action}: ${bookingId}`, {
    bookingId,
    action,
    bookerEmail,
    respondedBy: auth.uid,
  });

  return { success: true };
}
