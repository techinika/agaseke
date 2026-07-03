import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handleBookingPayment(
  txData: any,
  totalAmount: number,
  txRef: string,
  batch: admin.firestore.WriteBatch,
  paymentMethod: "momo" | "card",
) {
  const bookingId = txData.bookingId;
  if (!bookingId) return;

  const platformSharePercentage = txData.includeReferral
    ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
    : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
  const platformShare = totalAmount * platformSharePercentage;
  const creatorShare = totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
  const referralShare = totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

  batch.set(adminDb.collection("platformIncome").doc(), {
    amount: platformShare,
    txRef,
    reason: "booking_fee",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(adminDb.collection("creatorIncome").doc(), {
    creatorUid: txData.creatorUid,
    amount: creatorShare,
    txRef,
    reason: "booking_payment",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(adminDb.collection("creators").doc(txData.creatorId), {
    totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
    pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
  });

  if (txData.includeReferral && txData.referralUid) {
    batch.set(adminDb.collection("creatorIncome").doc(), {
      creatorUid: txData.referralUid,
      amount: referralShare,
      txRef,
      reason: "referral_commission",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection("creators").doc(txData.referralId), {
      totalEarnings: admin.firestore.FieldValue.increment(referralShare),
      pendingPayout: admin.firestore.FieldValue.increment(referralShare),
    });
  }

  batch.update(adminDb.collection("bookingRequests").doc(bookingId), {
    paymentStatus: "paid",
    status: "pending",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const buyerId = txData.buyerId || txData.supporterId || "";
  if (buyerId && buyerId !== "anonymous") {
    batch.update(adminDb.collection("profiles").doc(buyerId), {
      totalSupport: admin.firestore.FieldValue.increment(totalAmount),
      totalSupportedCreators: admin.firestore.FieldValue.increment(1),
    });
  }

  if (txData.creatorUid) {
    await createNotification({
      userId: txData.creatorUid,
      type: "booking_paid",
      title: "Booking Payment Received!",
      message: `Booking payment of ${totalAmount.toLocaleString()} RWF received from ${txData.buyerName || "a client"}`,
      metadata: { txRef, bookingId, amount: totalAmount, creatorShare },
      link: "/creator/bookings",
      actorName: txData.buyerName || undefined,
      actorId: txData.buyerId || undefined,
    });
  }

  if (buyerId && buyerId !== "anonymous") {
    await createNotification({
      userId: buyerId,
      type: "booking_paid",
      title: "Payment Confirmed!",
      message: `Your payment of ${totalAmount.toLocaleString()} RWF for booking with ${txData.creatorName || "creator"} is confirmed.`,
      metadata: { txRef, bookingId, amount: totalAmount },
      link: `/${txData.creatorId}/booking`,
      actorName: txData.creatorName || undefined,
      actorId: txData.creatorUid || undefined,
    });
  }

  // Email to creator
  const source = paymentMethod === "momo" ? "WEBHOOK_MOMO_EMAIL" : "WEBHOOK_CARD_EMAIL";
  console.log(`[${source}] Processing creator email for bookingId=${bookingId}, creatorUid=${txData.creatorUid}`);
  if (txData.creatorUid) {
    try {
      const profileSnap = await adminDb.collection("profiles").doc(txData.creatorUid).get();
      const creatorProfileEmail = profileSnap.exists ? profileSnap.data()?.email || "" : "";
      console.log(`[${source}] Resolved email="${creatorProfileEmail}" for creatorUid=${txData.creatorUid}`);
      if (!creatorProfileEmail) {
        console.log(`[${source}] No email found for creatorUid=${txData.creatorUid}, skipping email`);
      } else {
        let bookingDate = "";
        let bookingTime = "";
        let bookingType = "";
        let bookingReason = "";
        try {
          const bookingSnap = await adminDb.collection("bookingRequests").doc(bookingId).get();
          if (bookingSnap.exists) {
            const bd = bookingSnap.data();
            bookingDate = bd?.preferredDate || "";
            bookingTime = bd?.preferredTime || "";
            bookingType = bd?.preferredType || "both";
            bookingReason = bd?.reason || "";
          }
        } catch (bookingFetchErr) {
          console.error(`[${source}] Failed to fetch booking details for ${bookingId}:`, bookingFetchErr);
          await adminDb.collection("activityLogs").add({
            level: "error", category: "payment",
            message: `${source}: Failed to fetch booking details for ${bookingId}`,
            metadata: { txRef, bookingId, errorData: JSON.stringify(bookingFetchErr, Object.getOwnPropertyNames(bookingFetchErr)).slice(0, 5000) },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        try {
          const info = await transporter.sendMail({
            from: `"Agaseke" <${process.env.SMTP_USER}>`,
            to: creatorProfileEmail,
            subject: `New booking request from ${txData.buyerName || txData.bookerName || "a client"}`,
            html: `
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
                      <p>Hi ${txData.creatorName || "Creator"},</p>
                      <p><strong>${txData.buyerName || txData.bookerName || "A client"}</strong> has booked a meeting with you!</p>
                      <div class="booking-card">
                        <p><strong>Name:</strong> ${txData.buyerName || txData.bookerName || "N/A"}</p>
                        <p><strong>Email:</strong> ${txData.bookerEmail || "N/A"}</p>
                        <p><strong>Date:</strong> ${bookingDate || "N/A"}</p>
                        <p><strong>Time:</strong> ${bookingTime || "N/A"}</p>
                        <p><strong>Type:</strong> ${bookingType === "online" ? "Online" : bookingType === "physical" ? "In Person" : "Either"}</p>
                        <p><strong>Paid:</strong> ${totalAmount.toLocaleString()} RWF</p>
                      </div>
                      ${bookingReason ? `<div class="reason"><strong>Message:</strong><br>${bookingReason}</div>` : ""}
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
            `,
          });
          console.log(`[${source}] Email sent successfully to "${creatorProfileEmail}", messageId=${info.messageId}`);
        } catch (sendErr) {
          console.error(`[${source}] transporter.sendMail failed for "${creatorProfileEmail}":`, sendErr);
          await adminDb.collection("activityLogs").add({
            level: "error", category: "payment",
            message: `${source}: Failed to send creator email for booking ${bookingId}`,
            metadata: { txRef, bookingId, creatorEmail: creatorProfileEmail, error: String(sendErr) },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (emailErr) {
      console.error(`[${source}] Unexpected error in creator email block:`, emailErr);
      await adminDb.collection("activityLogs").add({
        level: "error", category: "payment",
        message: `${source}: Unexpected error in creator email block for ref ${txRef}`,
        metadata: { txRef, bookingId, error: String(emailErr) },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    console.log(`[${source}] No creatorUid in txData, cannot send creator email`);
  }

  // Email to buyer
  if (txData.bookerEmail) {
    try {
      await transporter.sendMail({
        from: `"Agaseke" <${process.env.SMTP_USER}>`,
        to: txData.bookerEmail,
        subject: `Payment confirmed for your booking with ${txData.creatorName || "creator"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #22c55e;">Payment Received!</h2>
            <p>Hi ${txData.buyerName || txData.bookerName || ""},</p>
            <p>Your payment of <strong>${totalAmount.toLocaleString()} RWF</strong> for your booking with <strong>${txData.creatorName || "creator"}</strong> has been confirmed.</p>
            <p>The creator will review and confirm your meeting shortly.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px;">Agaseke Platform</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send payment confirmation email to buyer:", emailErr);
      await adminDb.collection("activityLogs").add({
        level: "error", category: "payment",
        message: `${source}: Failed to send buyer email for ref ${txRef}`,
        metadata: { txRef, bookingId, bookerEmail: txData.bookerEmail, error: String(emailErr) },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Notify admins
  try {
    const adminsSnap = await adminDb.collection("profiles").where("isAdmin", "==", true).get();
    for (const adminDoc of adminsSnap.docs) {
      await createNotification({
        userId: adminDoc.id,
        type: "new_transaction",
        title: "Booking Payment Completed",
        message: `Booking payment of ${totalAmount.toLocaleString()} RWF from ${txData.buyerName || "a client"} to ${txData.creatorName || "creator"}`,
        link: "/admin/transactions",
      });
    }
  } catch (adminNotifErr) {
    console.error("Failed to notify admins:", adminNotifErr);
    await adminDb.collection("activityLogs").add({
      level: "error", category: "payment",
      message: `${source}: Failed to notify admins for ref ${txRef}`,
      metadata: { txRef, bookingId, error: String(adminNotifErr) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}