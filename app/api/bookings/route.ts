/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { creatorHandle, bookerId, bookerName, bookerEmail, bookerPhone, reason, preferredDate, preferredTime, preferredType } = await request.json();

    if (!creatorHandle || !bookerName || !bookerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const creatorDoc = await getDoc(doc(db, "creators", creatorHandle));
    if (!creatorDoc.exists()) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const creatorData = creatorDoc.data();

    if (!creatorData.bookingEnabled) {
      return NextResponse.json({ error: "Booking is not enabled for this creator" }, { status: 403 });
    }

    const bookingRef = await addDoc(collection(db, "bookingRequests"), {
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
      createdAt: serverTimestamp(),
    });

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

    return NextResponse.json({ success: true, bookingId: bookingRef.id });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
