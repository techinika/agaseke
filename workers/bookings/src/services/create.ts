import type { Env, CreateBookingRequest, BookingAvailability, BookingTier } from "../types";
import { firestoreGet, firestorePost, firestoreRunQuery, extractFirestoreDocument, getDocumentId } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import {
  getAvailabilityForDate,
  isSlotValid,
  parseTimeRange,
  hasOverlap,
  getMeetingLocation,
  timeToMinutes,
} from "./availability";

function validateBookingInput(body: CreateBookingRequest): string | null {
  if (!body.creatorHandle || !body.bookerName || !body.bookerEmail) {
    return "Missing required fields";
  }
  if (!body.preferredDate || !body.preferredTime) {
    return "Date and time are required";
  }
  return null;
}

async function resolveCreator(
  env: Env,
  handle: string
): Promise<{ doc: Record<string, unknown>; data: Record<string, unknown>; id: string } | null> {
  let doc = await firestoreGet(env, `creators/${handle}`);
  if (doc) {
    const fields = (doc as { fields?: Record<string, unknown> }).fields;
    if (!fields) return null;
    const id = getDocumentId(doc) || handle;
    return { doc, data: extractFirestoreDocument(fields), id };
  }

  const docs = await firestoreRunQuery(env, "creators", [
    { fieldPath: "uid", op: "EQUAL", value: handle },
  ], 1);

  if (docs && docs.length > 0) {
    const found = docs[0];
    const fields = (found as { fields?: Record<string, unknown> }).fields;
    if (!fields) return null;
    const id = getDocumentId(found) || handle;
    return { doc: found, data: extractFirestoreDocument(fields), id };
  }

  return null;
}

function resolveAvailabilityAndPrice(
  creatorData: Record<string, unknown>,
  tierId: string | undefined,
  paymentAmount: number | undefined,
  preferredTime: string
): {
  effectiveAvail: BookingAvailability | null;
  effectiveTier: BookingTier | null;
  verifiedPaymentAmount: number;
  duration: number;
} {
  let effectiveAvail: BookingAvailability | null = null;
  let effectiveTier: BookingTier | null = null;
  let verifiedPaymentAmount = 0;
  let duration = 0;

  if (tierId && creatorData.bookingTiers) {
    const tiers = creatorData.bookingTiers as BookingTier[];
    effectiveTier = tiers.find((t) => t.id === tierId && t.active) || null;

    if (effectiveTier) {
      effectiveAvail = effectiveTier.availability;
      verifiedPaymentAmount = effectiveTier.price;
      duration = effectiveTier.duration;
    }
  } else if (creatorData.bookingAvailability) {
    effectiveAvail = creatorData.bookingAvailability as BookingAvailability;

    const range = parseTimeRange(preferredTime);
    if (range) {
      duration = timeToMinutes(range.end) - timeToMinutes(range.start);
    }
  }

  return { effectiveAvail, effectiveTier, verifiedPaymentAmount, duration };
}

export async function createBooking(
  env: Env,
  body: CreateBookingRequest,
  auth: { uid: string; email: string | null }
): Promise<
  | { success: boolean; bookingId: string; paymentRequired: boolean; amount: number; txRef: string | null }
  | { error: string }
> {
  const validationError = validateBookingInput(body);
  if (validationError) {
    await logActivity(env, "warning", "payment", `Booking: ${validationError}`, {
      creatorHandle: body.creatorHandle,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: validationError };
  }

  const resolved = await resolveCreator(env, body.creatorHandle);
  if (!resolved) {
    await logActivity(env, "warning", "payment", "Booking: Creator not found", {
      creatorHandle: body.creatorHandle,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "Creator not found" };
  }

  const { data: creatorData, id: creatorId } = resolved;

  if (!creatorData.bookingEnabled) {
    await logActivity(env, "warning", "payment", "Booking: Booking not enabled for creator", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "Booking is not enabled for this creator" };
  }

  const { effectiveAvail, effectiveTier, verifiedPaymentAmount, duration } =
    resolveAvailabilityAndPrice(creatorData, body.tierId, body.paymentAmount, body.preferredTime);

  if (body.tierId && !effectiveTier) {
    await logActivity(env, "warning", "payment", "Booking: Invalid or inactive tier", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      tierId: body.tierId,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "Invalid or inactive tier" };
  }

  if (body.tierId && effectiveTier && body.paymentAmount !== undefined) {
    if (Number(body.paymentAmount) !== verifiedPaymentAmount) {
      await logActivity(env, "warning", "payment", "Booking: Price mismatch", {
        creatorHandle: body.creatorHandle,
        creatorName: creatorData.name,
        tierId: body.tierId,
        tierName: effectiveTier.name,
        expectedPrice: verifiedPaymentAmount,
        receivedPrice: Number(body.paymentAmount),
        bookerName: body.bookerName,
        bookerEmail: body.bookerEmail,
      });
      return { error: "Price mismatch. Please try again." };
    }
  }

  if (!effectiveAvail) {
    await logActivity(env, "warning", "payment", "Booking: No availability configured", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "No availability configured" };
  }

  if (!getAvailabilityForDate(effectiveAvail, body.preferredDate)) {
    await logActivity(env, "warning", "payment", "Booking: Selected date not available", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      preferredDate: body.preferredDate,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "The selected date is not available. Please choose a different date." };
  }

  if (!isSlotValid(effectiveAvail, body.preferredTime)) {
    await logActivity(env, "warning", "payment", "Booking: Selected time slot not available", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "The selected time slot is not available. Please choose a different time." };
  }

  const bookingRange = parseTimeRange(body.preferredTime);
  if (!bookingRange) {
    await logActivity(env, "warning", "payment", "Booking: Invalid time format", {
      creatorHandle: body.creatorHandle,
      creatorName: creatorData.name,
      preferredTime: body.preferredTime,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
    });
    return { error: "Invalid time format" };
  }

  const conflictingDocs = await firestoreRunQuery(env, "bookingRequests", [
    { fieldPath: "creatorHandle", op: "EQUAL", value: body.creatorHandle },
    { fieldPath: "preferredDate", op: "EQUAL", value: body.preferredDate },
    { fieldPath: "status", op: "IN", value: ["pending", "accepted"] },
  ]);

  if (conflictingDocs) {
    for (const doc of conflictingDocs) {
      const fields = (doc as { fields?: Record<string, unknown> }).fields;
      if (!fields) continue;

      const existingPrefTime = (fields as Record<string, { stringValue?: string }>).preferredTime?.stringValue;
      if (!existingPrefTime) continue;

      const existingRange = parseTimeRange(existingPrefTime);
      if (existingRange) {
        if (hasOverlap(bookingRange.start, bookingRange.end, existingRange.start, existingRange.end)) {
          await logActivity(env, "warning", "payment", "Booking: Time slot overlaps with existing booking", {
            creatorHandle: body.creatorHandle,
            creatorName: creatorData.name,
            preferredDate: body.preferredDate,
            preferredTime: body.preferredTime,
            existingBookingId: (doc as { name?: string }).name?.split("/").pop(),
            bookerName: body.bookerName,
            bookerEmail: body.bookerEmail,
          });
          return { error: "This time slot overlaps with an existing booking. Please choose a different time." };
        }
      }
    }
  }

  const isPaidTier = verifiedPaymentAmount > 0;
  const txRef = isPaidTier
    ? `AGS-BOOK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    : "";

  const preferredType = body.preferredType || "both";
  const meetingLocation = getMeetingLocation(effectiveAvail, preferredType);

  const now = new Date().toISOString();
  const bookingFields: Record<string, unknown> = {
    creatorId: { stringValue: creatorId },
    creatorName: { stringValue: String(creatorData.name || "") },
    creatorHandle: { stringValue: body.creatorHandle },
    creatorUid: { stringValue: String(creatorData.uid || "") },
    bookerId: { stringValue: body.bookerId || auth.uid },
    bookerName: { stringValue: body.bookerName },
    bookerEmail: { stringValue: body.bookerEmail },
    bookerPhone: { stringValue: body.bookerPhone || "" },
    reason: { stringValue: body.reason || "" },
    preferredDate: { stringValue: body.preferredDate },
    preferredTime: { stringValue: body.preferredTime },
    preferredType: { stringValue: preferredType },
    meetingLocation: { stringValue: meetingLocation || "" },
    status: { stringValue: "pending" },
    tierId: { stringValue: body.tierId || "" },
    tierName: { stringValue: body.tierName || "" },
    tierDuration: { integerValue: String(duration) },
    paymentAmount: { integerValue: String(isPaidTier ? verifiedPaymentAmount : 0) },
    paymentStatus: { stringValue: isPaidTier ? "pending" : "none" },
    txRef: { stringValue: txRef || "" },
    createdAt: { timestampValue: now },
  };

  const bookingResult = await firestorePost(env, "bookingRequests", { fields: bookingFields });
  if (!bookingResult) {
    await logActivity(env, "error", "payment", "Booking: Failed to create booking document");
    return { error: "Failed to create booking" };
  }

  const bookingId = getDocumentId(bookingResult) || "";

  if (isPaidTier && txRef) {
    const transactionFields: Record<string, unknown> = {
      ref: { stringValue: txRef },
      amount: { integerValue: String(verifiedPaymentAmount) },
      bookingId: { stringValue: bookingId },
      creatorId: { stringValue: creatorId },
      creatorUid: { stringValue: String(creatorData.uid || "") },
      creatorName: { stringValue: String(creatorData.name || "") },
      bookerName: { stringValue: body.bookerName },
      bookerEmail: { stringValue: body.bookerEmail },
      bookerId: { stringValue: body.bookerId || auth.uid || "anonymous" },
      status: { stringValue: "pending" },
      type: { stringValue: "booking" },
      createdAt: { timestampValue: now },
    };

    await firestorePost(env, "transactions", { fields: transactionFields }, txRef);
  }

  const bookerId = body.bookerId || auth.uid || "";

  if (creatorData.uid) {
    await createNotification(env, {
      userId: String(creatorData.uid),
      type: "booking_request",
      title: "New Booking Request",
      message: `${body.bookerName} wants to book a meeting on ${body.preferredDate} at ${body.preferredTime}`,
      link: "/creator/bookings",
      actorName: body.bookerName,
      metadata: { bookingId },
    });
  }

  if (bookerId) {
    await createNotification(env, {
      userId: bookerId,
      type: "booking_request",
      title: "Booking Request Sent",
      message: `Your booking request with ${creatorData.name} on ${body.preferredDate} at ${body.preferredTime} has been sent.`,
      link: `/${body.creatorHandle}`,
      actorName: String(creatorData.name || ""),
      metadata: { bookingId },
    });
  }

  await logActivity(env, "info", "booking", "Booking created successfully", {
    bookingId,
    creatorHandle: body.creatorHandle,
    creatorName: creatorData.name,
    bookerName: body.bookerName,
    bookerEmail: body.bookerEmail,
    isPaidTier,
    amount: verifiedPaymentAmount,
  });

  return {
    success: true,
    bookingId,
    paymentRequired: isPaidTier,
    amount: isPaidTier ? verifiedPaymentAmount : 0,
    txRef: isPaidTier ? txRef : null,
  };
}
