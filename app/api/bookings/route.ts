/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";
import { optionalAuth } from "@/lib/authMiddleware";
import { BookingAvailability, BookingTier } from "@/types/booking";
import { encrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

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
  const authUser = await optionalAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    let { creatorHandle, bookerId, bookerName, bookerEmail, bookerPhone, reason, preferredDate, preferredTime, preferredType, tierId, tierName, paymentAmount } = await request.json();
    if (authUser) bookerId = authUser.uid;

    if (!creatorHandle || !bookerName || !bookerEmail) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Missing required fields",
        metadata: { creatorHandle, bookerName, bookerEmail, bookerId: bookerId || null },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!preferredDate || !preferredTime) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Date and time are required",
        metadata: { creatorHandle, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    let creatorDoc = await adminDb.collection("creators").doc(creatorHandle).get();
    if (!creatorDoc.exists) {
      const q = await adminDb.collection("creators").where("uid", "==", creatorHandle).limit(1).get();
      if (q.empty) {
        await adminDb.collection("activityLogs").add({
          level: "warning",
          category: "payment",
          message: "Booking: Creator not found",
          metadata: { creatorHandle, bookerName, bookerEmail },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      }
      creatorDoc = q.docs[0];
    }

    const creatorData = creatorDoc.data();

    // Resolve creator email from profiles collection (creators doc has no email field)
    let creatorEmail = "";
    console.log(`[BOOKING_EMAIL] Resolving email for creator handle=${creatorHandle}, uid=${creatorData?.uid}`);
    if (creatorData?.uid) {
      try {
        const profileSnap = await adminDb.collection("profiles").doc(creatorData.uid).get();
        if (profileSnap.exists) {
          creatorEmail = profileSnap.data()?.email || "";
          console.log(`[BOOKING_EMAIL] Found profile for uid=${creatorData.uid}, email="${creatorEmail}"`);
        } else {
          console.log(`[BOOKING_EMAIL] No profile doc exists for uid=${creatorData.uid}`);
        }
      } catch (err) {
        console.error("[BOOKING_EMAIL] Failed to fetch creator profile for email:", err);
        await adminDb.collection("activityLogs").add({
          level: "error",
          category: "payment",
          message: "Booking: Failed to fetch creator profile for email",
          metadata: { creatorHandle, creatorUid: creatorData?.uid, errorData: JSON.stringify(err, Object.getOwnPropertyNames(err)).slice(0, 5000) },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      console.log(`[BOOKING_EMAIL] Creator has no uid field, cannot look up profile`);
    }

    if (!creatorData?.bookingEnabled) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Booking not enabled for creator",
        metadata: { creatorHandle, creatorName: creatorData?.name, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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
        await adminDb.collection("activityLogs").add({
          level: "warning",
          category: "payment",
          message: "Booking: Invalid or inactive tier",
          metadata: { creatorHandle, creatorName: creatorData?.name, tierId, bookerName, bookerEmail },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ error: "Invalid or inactive tier" }, { status: 400 });
      }
      effectiveAvail = effectiveTier.availability;
      verifiedPaymentAmount = effectiveTier.price;
      duration = effectiveTier.duration;

      if (Number(paymentAmount) !== verifiedPaymentAmount) {
        await adminDb.collection("activityLogs").add({
          level: "warning",
          category: "payment",
          message: "Booking: Price mismatch",
          metadata: { creatorHandle, creatorName: creatorData?.name, tierId, tierName: effectiveTier.name, expectedPrice: verifiedPaymentAmount, receivedPrice: Number(paymentAmount), bookerName, bookerEmail },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
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
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: No availability configured",
        metadata: { creatorHandle, creatorName: creatorData?.name, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: "No availability configured" }, { status: 400 });
    }

    // Validate date is within availability
    if (!getAvailabilityForDate(effectiveAvail, preferredDate)) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Selected date not available",
        metadata: { creatorHandle, creatorName: creatorData?.name, preferredDate, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json(
        { error: "The selected date is not available. Please choose a different date." },
        { status: 400 }
      );
    }

    // Validate time slot
    if (!isSlotValid(effectiveAvail, preferredTime)) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Selected time slot not available",
        metadata: { creatorHandle, creatorName: creatorData?.name, preferredDate, preferredTime, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json(
        { error: "The selected time slot is not available. Please choose a different time." },
        { status: 400 }
      );
    }

    // Duration-aware conflict detection
    const bookingRange = parseTimeRange(preferredTime);
    if (!bookingRange) {
      await adminDb.collection("activityLogs").add({
        level: "warning",
        category: "payment",
        message: "Booking: Invalid time format",
        metadata: { creatorHandle, creatorName: creatorData?.name, preferredTime, bookerName, bookerEmail },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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
          await adminDb.collection("activityLogs").add({
            level: "warning",
            category: "payment",
            message: "Booking: Time slot overlaps with existing booking",
            metadata: { creatorHandle, creatorName: creatorData?.name, preferredDate, preferredTime, existingBookingId: doc.id, bookerName, bookerEmail },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
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

    // Email to creator (deferred to webhook for paid tiers — sent after payment confirmation)
    console.log(`[BOOKING_EMAIL] Decision: creatorEmail="${creatorEmail}", isPaidTier=${isPaidTier}, willSend=${!!creatorEmail && !isPaidTier}`);
    if (creatorEmail && !isPaidTier) {
      console.log(`[BOOKING_EMAIL] Sending creator email to "${creatorEmail}" for booker "${bookerName}"`);
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
                .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
                .booking-card p { margin: 8px 0; }
                .reason { background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .cta { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; }
                .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
                </div>
                <div class="content">
                  <p>Hi ${creatorData.name},</p>
                  <p><strong>${bookerName}</strong> has requested to book a meeting with you!</p>
                  <div class="booking-card">
                    <p><strong>Name:</strong> ${bookerName}</p>
                    <p><strong>Email:</strong> ${bookerEmail}</p>
                    <p><strong>Date:</strong> ${preferredDate || "Not specified"}</p>
                    <p><strong>Time:</strong> ${preferredTime || "Not specified"}</p>
                    <p><strong>Type:</strong> ${preferredType === "online" ? "Online" : preferredType === "physical" ? "In Person" : "Either"}</p>
                  </div>
                  ${reason ? `<div class="reason"><strong>Message from ${bookerName}:</strong><br>${reason}</div>` : ""}
                  <p>Please log in to your dashboard to accept or decline this request.</p>
                  <div style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.me"}/creator/bookings" class="cta">Manage Bookings</a>
                  </div>
                  <div class="footer">
                    <p>This email was sent by Agaseke Platform</p>
                    <p>© ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;
        const info = await transporter.sendMail({
          from: `"Agaseke" <${process.env.SMTP_USER}>`,
          to: creatorEmail,
          subject: `New booking request from ${bookerName}`,
          html: emailHtml,
        });
        console.log(`[BOOKING_EMAIL] Email sent successfully to "${creatorEmail}", messageId=${info.messageId}`);
      } catch (emailError) {
        console.error("[BOOKING_EMAIL] Failed to send booking notification email:", emailError);
        await adminDb.collection("activityLogs").add({
          level: "error",
          category: "payment",
          message: "Booking: Failed to send creator notification email",
          metadata: { creatorHandle, creatorEmail, bookerName, errorData: JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)).slice(0, 5000) },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else if (!creatorEmail) {
      console.log(`[BOOKING_EMAIL] Skipping creator email — no email address resolved for creator handle="${creatorHandle}"`);
    } else {
      console.log(`[BOOKING_EMAIL] Skipping creator email — paid tier (will be sent via webhook after payment)`);
    }

    // In-app notification to creator
    if (creatorData.uid) {
      await createNotification({
        userId: creatorData.uid,
        type: "booking_request",
        title: "New Booking Request",
        message: `${bookerName} wants to book a meeting on ${preferredDate} at ${preferredTime}`,
        link: "/creator/bookings",
        actorName: bookerName,
        metadata: { bookingId: bookingRef.id },
      });
    }

    // In-app notification + email to booker (confirm request was sent)
    if (bookerId) {
      await createNotification({
        userId: bookerId,
        type: "booking_request",
        title: "Booking Request Sent",
        message: `Your booking request with ${creatorData.name} on ${preferredDate} at ${preferredTime} has been sent.`,
        link: `/${creatorHandle}`,
        actorName: creatorData.name,
        metadata: { bookingId: bookingRef.id },
      });
    }

    if (bookerEmail) {
      try {
        const payUrl = isPaidTier
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.me"}/booking/pay/${bookingRef.id}`
          : null;

        const subject = isPaidTier
          ? `Payment required to confirm your booking with ${creatorData.name}`
          : `Booking request sent to ${creatorData.name}`;

        const bookerHtml = isPaidTier ? `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ea580c;">Payment Required</h2>
            <p>Hi ${bookerName},</p>
            <p>Your booking request with <strong>${creatorData.name}</strong> has been received.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Date:</strong> ${preferredDate}</p>
              <p><strong>Time:</strong> ${preferredTime}</p>
              <p><strong>Type:</strong> ${preferredType === "online" ? "Online" : preferredType === "physical" ? "In Person" : "Either"}</p>
              <p><strong>Amount:</strong> ${verifiedPaymentAmount.toLocaleString()} RWF</p>
              ${reason ? `<p><strong>Message:</strong> ${reason}</p>` : ""}
            </div>
            <p>This booking requires payment before it can be confirmed. Please complete your payment using the link below:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${payUrl}" style="display: inline-block; background: #f97316; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Pay ${verifiedPaymentAmount.toLocaleString()} RWF Now
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">Your booking will be confirmed once payment is received.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px;">Agaseke Platform</p>
          </div>
        ` : `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ea580c;">Request Sent!</h2>
            <p>Hi ${bookerName},</p>
            <p>Your booking request with <strong>${creatorData.name}</strong> has been received.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Date:</strong> ${preferredDate}</p>
              <p><strong>Time:</strong> ${preferredTime}</p>
              <p><strong>Type:</strong> ${preferredType === "online" ? "Online" : preferredType === "physical" ? "In Person" : "Either"}</p>
              ${reason ? `<p><strong>Message:</strong> ${reason}</p>` : ""}
            </div>
            <p>You will receive an email once ${creatorData.name} responds to your request.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px;">Agaseke Platform</p>
          </div>
        `;

        await transporter.sendMail({
          from: `"Agaseke" <${process.env.SMTP_USER}>`,
          to: bookerEmail,
          subject,
          html: bookerHtml,
        });

        console.log(`[BOOKING_EMAIL] ${isPaidTier ? "Payment-required" : "Confirmation"} email sent to booker "${bookerEmail}"`);
      } catch (emailError) {
        console.error("[BOOKING_EMAIL] Failed to send booking email to booker:", emailError);
        await adminDb.collection("activityLogs").add({
          level: "error",
          category: "payment",
          message: "Booking: Failed to send booker email",
          metadata: { creatorHandle, bookerEmail, bookerName, errorData: JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)).slice(0, 5000) },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
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
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "payment",
      message: "Booking: Failed to create booking",
      metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
