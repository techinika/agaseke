import type { Env, CreateBookingRequest, BookingAvailability, BookingTier } from "../types";
import { firestoreGet, firestorePost, firestoreRunQuery, extractFirestoreDocument, getDocumentId } from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { getCurrencyDefinition, isCurrencyCode } from "../money/registry.generated";
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

function amountField(value: number): Record<string, unknown> {
  return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasSupportedPrecision(value: number, currency: string): boolean {
  if (!isCurrencyCode(currency)) return false;
  const factor = 10 ** getCurrencyDefinition(currency).minorUnit;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-6;
}

function resolveTierPrice(tier: BookingTier): { currency: string; amount: number } | null {
  const currency = typeof tier.currency === "string" ? tier.currency.toUpperCase() : "";
  if (!currency || !isCurrencyCode(currency)) return null;

  const prices = tier.prices && typeof tier.prices === "object" ? tier.prices : null;
  if (prices) {
    const amount = num((prices as Record<string, unknown>)[currency]);
    if (amount > 0 && hasSupportedPrecision(amount, currency)) {
      return { currency, amount };
    }
    return null;
  }

  // Legacy compatibility: primary price belongs to declared tier currency only.
  const legacy = num((tier as any).price);
  if (legacy > 0 && hasSupportedPrecision(legacy, currency)) {
    return { currency, amount: legacy };
  }
  return null;
}

async function resolveCreator(
  env: Env,
  handle: string
): Promise<{ doc: Record<string, unknown>; data: Record<string, unknown>; id: string } | null> {
  const doc = await firestoreGet(env, `creators/${handle}`);
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
  _paymentAmount: number | undefined,
  preferredTime: string
): {
  effectiveAvail: BookingAvailability | null;
  effectiveTier: BookingTier | null;
  verifiedPaymentAmount: number;
  duration: number;
  currency: string;
} {
  let effectiveAvail: BookingAvailability | null = null;
  let effectiveTier: BookingTier | null = null;
  let verifiedPaymentAmount = 0;
  let duration = 0;
  let currency = "";

  if (tierId && creatorData.bookingTiers) {
    const tiers = creatorData.bookingTiers as BookingTier[];
    effectiveTier = tiers.find((t) => t.id === tierId && t.active) || null;

    if (effectiveTier) {
      effectiveAvail = effectiveTier.availability;
      const resolved = resolveTierPrice(effectiveTier);
      if (resolved) {
        verifiedPaymentAmount = resolved.amount;
        currency = resolved.currency;
      }
      duration = Number(effectiveTier.duration) || 0;
    }
  } else if (creatorData.bookingAvailability) {
    effectiveAvail = creatorData.bookingAvailability as BookingAvailability;

    const range = parseTimeRange(preferredTime);
    if (range) {
      duration = timeToMinutes(range.end) - timeToMinutes(range.start);
    }
  }

  return { effectiveAvail, effectiveTier, verifiedPaymentAmount, duration, currency };
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

  const { effectiveAvail, effectiveTier, verifiedPaymentAmount, duration, currency } =
    resolveAvailabilityAndPrice(creatorData, body.tierId ?? undefined, body.paymentAmount, body.preferredTime);

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

  if (body.tierId && effectiveTier && verifiedPaymentAmount > 0 && !currency) {
    return { error: "This tier has no valid currency or price" };
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
  if (isPaidTier && !currency) {
    return { error: "A currency is required for paid bookings" };
  }
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
    tierDuration: amountField(duration),
    paymentAmount: amountField(isPaidTier ? verifiedPaymentAmount : 0),
    ...(currency ? { currency: { stringValue: currency } } : {}),
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
    const txFields: Record<string, unknown> = {
      type: { stringValue: "booking" },
      status: { stringValue: "pending" },
      amount: amountField(verifiedPaymentAmount),
      currency: { stringValue: currency },
      creatorId: { stringValue: body.creatorHandle },
      creatorUid: { stringValue: String(creatorData.uid || "") },
      supporterId: { stringValue: body.bookerId || auth.uid },
      ref: { stringValue: txRef },
      bookingId: { stringValue: bookingId },
      tierName: { stringValue: body.tierName || "" },
      initiatedAt: { timestampValue: now },
      createdAt: { timestampValue: now },
    };

    await firestorePost(env, "transactions", { fields: txFields });
  }

  await createNotification(env, {
    userId: String(creatorData.uid || ""),
    type: "booking",
    title: "New Booking Request",
    message: `${body.bookerName} requested a meeting on ${body.preferredDate} at ${body.preferredTime}`,
    metadata: {
      bookingId,
      bookerName: body.bookerName,
      bookerEmail: body.bookerEmail,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
    },
  });

  await logActivity(env, "info", "payment", "Booking request created", {
    bookingId,
    creatorHandle: body.creatorHandle,
    creatorName: creatorData.name,
    bookerName: body.bookerName,
    tierId: body.tierId,
    paymentAmount: isPaidTier ? verifiedPaymentAmount : 0,
  });

  return {
    success: true,
    bookingId,
    paymentRequired: isPaidTier,
    amount: isPaidTier ? verifiedPaymentAmount : 0,
    txRef: txRef || null,
  };
}
