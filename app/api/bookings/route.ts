/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { creatorHandle, bookerId, bookerName, bookerEmail, bookerPhone, reason, preferredDate, preferredTime, preferredType, tierId, tierName, paymentAmount } = await request.json();

    if (!creatorHandle || !bookerName || !bookerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // Check for conflicting bookings at the same time slot
    const conflictingQuery = await adminDb
      .collection("bookingRequests")
      .where("creatorHandle", "==", creatorHandle)
      .where("preferredDate", "==", preferredDate)
      .where("preferredTime", "==", preferredTime)
      .where("status", "in", ["pending", "accepted"])
      .get();

    if (!conflictingQuery.empty) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please choose a different time." },
        { status: 409 }
      );
    }

    const isPaidTier = Number(paymentAmount) > 0;
    const txRef = isPaidTier ? `AGS-BOOK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : "";

    const bookingRef = await adminDb.collection("bookingRequests").add({
      creatorId: creatorDoc.id,
      creatorName: creatorData.name,
      creatorHandle: creatorHandle,
      bookerId: bookerId || null,
      bookerName,
      bookerEmail,
      bookerPhone: bookerPhone || "",
      reason: reason || "",
      preferredDate: preferredDate || "",
      preferredTime: preferredTime || "",
      preferredType: preferredType || "both",
      status: "pending",
      tierId: tierId || null,
      tierName: tierName || null,
      paymentAmount: isPaidTier ? Number(paymentAmount) : 0,
      paymentStatus: isPaidTier ? "pending" : "none",
      txRef: txRef || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (isPaidTier) {
      // Create a pending transaction record for webhook processing
      await adminDb.collection("transactions").doc(txRef).set({
        ref: txRef,
        amount: Number(paymentAmount),
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
      amount: isPaidTier ? Number(paymentAmount) : 0,
      txRef: isPaidTier ? txRef : null,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
