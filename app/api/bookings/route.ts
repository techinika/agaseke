/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";
import { BookingAvailability, BookingTier } from "@/types/booking";
import { encrypt } from "@/lib/encryption";

function parseTimeRange(preferredTime: string): { start: string; end: string } | null {
  const parts = preferredTime.split(" - ");
  if (parts.length !== 2) return null;
  return { start: parts[0].trim(), end: parts[1].trim() };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hasOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);
}

function getAvailabilityForDate(avail: BookingAvailability, dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startRaw = avail.startDate ? new Date(avail.startDate + "T00:00:00") : new Date(today);
  startRaw.setHours(0, 0, 0, 0);
  const rangeStart = startRaw > today ? startRaw : today;

  const endRaw = avail.endDate ? new Date(avail.endDate + "T23:59:59") : new Date(today);
  if (!avail.endDate) endRaw.setMonth(endRaw.getMonth() + 2);

  if (date < rangeStart || date > endRaw) return false;
  if (!avail.daysOfWeek.includes(date.getDay())) return false;
  return true;
}

function isSlotValid(avail: BookingAvailability, preferredTime: string): boolean {
  const range = parseTimeRange(preferredTime);
  if (!range) return false;
  return avail.defaultSlots.some(
    (s) => s.startTime === range.start && s.endTime === range.end
  );
}

function getMeetingLocation(avail: BookingAvailability, preferredType: string): string {
  if (preferredType === "online" || preferredType === "both") {
    if (avail.onlineLink) return avail.onlineLink;
  }
  if (preferredType === "physical" || preferredType === "both") {
    if (avail.location) return avail.location;
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { creatorHandle, bookerId, bookerName, bookerEmail, bookerPhone, reason, preferredDate, preferredTime, preferredType, tierId, tierName, paymentAmount } = await request.json();

    if (!creatorHandle || !bookerName || !bookerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!preferredDate || !preferredTime) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    let creatorDoc = await adminDb.collection("creators").doc(creatorHandle).get();
    if (!creatorDoc.exists) {
      const q = await adminDb.collection("creators").where("uid", "==", creatorHandle).limit(1).get();
      if (q.empty) {
        return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      }
      creatorDoc = q.docs[0];
    }

    const creatorData = creatorDoc.data();

    if (!creatorData?.bookingEnabled) {
      return NextResponse.json({ error: "Booking is not enabled for this creator" }, { status: 403 });
    }

    // Resolve which availability and price to use (simple mode vs tiered)
    let effectiveAvail: BookingAvailability | null = null;
    let effectiveTier: BookingTier | null = null;
    let verifiedPaymentAmount = 0;
    let duration = 0;

    if (tierId && creatorData.bookingTiers) {
      effectiveTier = creatorData.bookingTiers.find(
        (t: BookingTier) => t.id === tierId && t.active
      );
      if (!effectiveTier) {
        return NextResponse.json({ error: "Invalid or inactive tier" }, { status: 400 });
      }
      effectiveAvail = effectiveTier.availability;
      verifiedPaymentAmount = effectiveTier.price;
      duration = effectiveTier.duration;

      if (Number(paymentAmount) !== verifiedPaymentAmount) {
        return NextResponse.json({ error: "Price mismatch. Please try again." }, { status: 400 });
      }
    } else if (creatorData.bookingAvailability) {
      effectiveAvail = creatorData.bookingAvailability;

      // For simple mode, parse duration from the time slot
      const range = parseTimeRange(preferredTime);
      if (range) {
        duration = timeToMinutes(range.end) - timeToMinutes(range.start);
      }
    }

    // Validate availability exists
    if (!effectiveAvail) {
      return NextResponse.json({ error: "No availability configured" }, { status: 400 });
    }

    // Validate date is within availability
    if (!getAvailabilityForDate(effectiveAvail, preferredDate)) {
      return NextResponse.json(
        { error: "The selected date is not available. Please choose a different date." },
        { status: 400 }
      );
    }

    // Validate time slot
    if (!isSlotValid(effectiveAvail, preferredTime)) {
      return NextResponse.json(
        { error: "The selected time slot is not available. Please choose a different time." },
        { status: 400 }
      );
    }

    // Duration-aware conflict detection
    const bookingRange = parseTimeRange(preferredTime);
    if (!bookingRange) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    const conflictingDocs = await adminDb
      .collection("bookingRequests")
      .where("creatorHandle", "==", creatorHandle)
      .where("preferredDate", "==", preferredDate)
      .where("status", "in", ["pending", "accepted"])
      .get();

    for (const doc of conflictingDocs.docs) {
      const existing = doc.data();
      const existingRange = parseTimeRange(existing.preferredTime);
      if (existingRange) {
        if (hasOverlap(bookingRange.start, bookingRange.end, existingRange.start, existingRange.end)) {
          return NextResponse.json(
            { error: "This time slot overlaps with an existing booking. Please choose a different time." },
            { status: 409 }
          );
        }
      }
    }

    const isPaidTier = verifiedPaymentAmount > 0;
    const txRef = isPaidTier ? `AGS-BOOK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : "";

    // Determine meeting location
    const meetingLocation = getMeetingLocation(effectiveAvail, preferredType || "both");

    // Encrypt the reason before storing it at rest
    const encryptedReason = reason ? encrypt(reason) : "";

    const bookingRef = await adminDb.collection("bookingRequests").add({
      creatorId: creatorDoc.id,
      creatorName: creatorData.name,
      creatorHandle: creatorHandle,
      bookerId: bookerId || null,
      bookerName,
      bookerEmail,
      bookerPhone: bookerPhone || "",
      reason: encryptedReason,
      preferredDate: preferredDate || "",
      preferredTime: preferredTime || "",
      preferredType: preferredType || "both",
      meetingLocation: meetingLocation || null,
      status: "pending",
      tierId: tierId || null,
      tierName: tierName || null,
      tierDuration: duration || null,
      paymentAmount: isPaidTier ? verifiedPaymentAmount : 0,
      paymentStatus: isPaidTier ? "pending" : "none",
      txRef: txRef || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (isPaidTier) {
      await adminDb.collection("transactions").doc(txRef).set({
        ref: txRef,
        amount: verifiedPaymentAmount,
        bookingId: bookingRef.id,
        creatorId: creatorDoc.id,
        creatorUid: creatorData.uid || "",
        creatorName: creatorData.name || "",
        bookerName,
        bookerEmail,
        bookerId: bookerId || "anonymous",
        status: "pending",
        type: "booking",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (creatorData.email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/comms/email/booking/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorEmail: creatorData.email,
            creatorName: creatorData.name,
            bookerName,
            bookerEmail,
            reason,
            preferredDate,
            preferredTime,
            preferredType,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send booking notification email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
      paymentRequired: isPaidTier,
      amount: isPaidTier ? verifiedPaymentAmount : 0,
      txRef: isPaidTier ? txRef : null,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
