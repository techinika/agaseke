import admin from "firebase-admin";
import { adminDb } from "@/db/firebaseAdmin";
import { createNotification } from "@/lib/adminNotifications";
import { transporter } from "@/lib/emailTransporter";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handleGatheringPayment(
  txData: any,
  totalAmount: number,
  txRef: string,
  batch: admin.firestore.WriteBatch,
) {
  console.log(
    `[GATHERING_PAYMENT] Starting for txRef=${txRef}, gatheringId=${txData.gatheringId}, amount=${totalAmount}, buyer=${txData.attendeeName || "anonymous"}`,
  );

  const platformSharePercentage = txData.includeReferral
    ? Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE_WITH_REFERRAL)
    : Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE);
  const platformShare = totalAmount * platformSharePercentage;
  const creatorShare =
    totalAmount * Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
  const referralShare =
    totalAmount * Number(process.env.NEXT_PUBLIC_REFERRAL_SHARE);

  console.log(
    `[GATHERING_PAYMENT] Splits: platform=${platformShare}, creator=${creatorShare}, referral=${referralShare}, txRef=${txRef}`,
  );

  batch.set(adminDb.collection("platformIncome").doc(), {
    amount: platformShare,
    txRef,
    reason: "gathering_ticket",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(adminDb.collection("creatorIncome").doc(), {
    creatorUid: txData.creatorUid,
    amount: creatorShare,
    txRef,
    reason: "gathering_ticket",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(adminDb.collection("creators").doc(txData.creatorId), {
    totalEarnings: admin.firestore.FieldValue.increment(creatorShare),
    pendingPayout: admin.firestore.FieldValue.increment(creatorShare),
  });

  if (txData.includeReferral && txData.referralUid) {
    console.log(
      `[GATHERING_PAYMENT] Including referral: uid=${txData.referralUid}, amount=${referralShare}`,
    );
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

  const attendanceDocRef = adminDb.collection("gatheringsAttendance").doc();
  console.log(
    `[GATHERING_PAYMENT] Creating attendance: docId=${attendanceDocRef.id}, gatheringId=${txData.gatheringId}`,
  );
  batch.set(attendanceDocRef, {
    gatheringId: txData.gatheringId,
    supporterId: txData.supporterId || "anonymous",
    supporterName: txData.attendeeName || "Anonymous",
    supporterEmail: txData.attendeeEmail || "",
    supporterPhoto: txData.attendeePhoto || "",
    creatorHandle: txData.creatorId,
    paid: true,
    amount: totalAmount,
    paymentRef: txRef,
    checkedIn: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    `[GATHERING_PAYMENT] Creating ticketSales record: gatheringId=${txData.gatheringId}, amount=${totalAmount}`,
  );
  batch.set(adminDb.collection("ticketSales").doc(), {
    creatorHandle: txData.creatorId,
    buyerId: txData.supporterId || "anonymous",
    transactionId: txRef,
    gatheringId: txData.gatheringId,
    ticketAmount: totalAmount,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(
    adminDb.collection("creatorGatherings").doc(txData.gatheringId),
    {
      attendeesCount: admin.firestore.FieldValue.increment(1),
    },
  );

  if (txData.creatorUid) {
    console.log(
      `[GATHERING_PAYMENT] Notifying creator ${txData.creatorUid} of new ticket sale`,
    );
    await createNotification({
      userId: txData.creatorUid,
      type: "new_gathering",
      title: "New Ticket Sale!",
      message: `${txData.attendeeName || "Someone"} purchased a ticket for your gathering`,
      metadata: {
        txRef,
        gatheringId: txData.gatheringId,
        amount: totalAmount,
        creatorShare,
      },
      link: "/creator/gatherings",
      actorName: txData.attendeeName || undefined,
    });
  }

  try {
    const adminsSnap = await adminDb
      .collection("profiles")
      .where("isAdmin", "==", true)
      .get();
    console.log(
      `[GATHERING_PAYMENT] Notifying ${adminsSnap.size} admins of ticket sale`,
    );
    for (const adminDoc of adminsSnap.docs) {
      await createNotification({
        userId: adminDoc.id,
        type: "new_transaction",
        title: "Ticket Sale",
        message: `Ticket sale of ${totalAmount.toLocaleString()} RWF from ${txData.attendeeName || "someone"}`,
        link: "/admin/transactions",
      });
    }
  } catch (adminNotifErr) {
    console.error(
      "[GATHERING_PAYMENT] Failed to notify admins:",
      adminNotifErr,
    );
  }

  // Send ticket confirmation email to attendee
  if (txData.attendeeEmail) {
    console.log(
      `[GATHERING_PAYMENT] Sending ticket email to ${txData.attendeeEmail} for ref ${txRef}`,
    );
    try {
      const gatheringSnap = await adminDb
        .collection("creatorGatherings")
        .doc(txData.gatheringId)
        .get();
      const gData = gatheringSnap.exists ? gatheringSnap.data() : null;
      const creatorProfileSnap = await adminDb
        .collection("profiles")
        .doc(txData.creatorUid)
        .get();
      const creatorName = creatorProfileSnap.exists
        ? creatorProfileSnap.data()?.displayName || txData.creatorId
        : txData.creatorId;

      const eventStart =
        gData?.date && gData?.time
          ? new Date(`${gData.date} ${gData.time}`)
          : null;
      const eventEnd = eventStart
        ? new Date(eventStart.getTime() + 2 * 60 * 60 * 1000)
        : null;
      const fmtGoogle = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const enc = (s: string) => encodeURIComponent(s || "");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.me";

      let googleCalUrl = "";
      let icsContent = "";
      let outlookUrl = "";
      if (eventStart && eventEnd && !isNaN(eventStart.getTime())) {
        const title = gData?.title || "Event";
        const desc = gData?.description || "";
        const loc = gData?.location || "";
        googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}&dates=${fmtGoogle(eventStart)}/${fmtGoogle(eventEnd)}&details=${enc(desc)}&location=${enc(loc)}`;
        icsContent = `BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${fmtGoogle(eventStart)}%0ADTEND:${fmtGoogle(eventEnd)}%0ASUMMARY:${enc(title)}%0ADESCRIPTION:${enc(desc)}%0ALOCATION:${enc(loc)}%0AEND:VEVENT%0AEND:VCALENDAR`;
        outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${enc(title)}&body=${enc(desc)}&location=${enc(loc)}&startdt=${eventStart.toISOString()}&enddt=${eventEnd.toISOString()}`;
      }

      const qrValue = attendanceDocRef.id;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrValue}`;

      await transporter.sendMail({
        from: `"Agaseke" <${process.env.SMTP_USER}>`,
        to: txData.attendeeEmail,
        subject: `Your Ticket for ${gData?.title || "Event"} - Confirmed!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
                .container { max-width: 480px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
                .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
                .event-card p { margin: 8px 0; }
                .cta { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 4px; }
                .cal-btn { display: inline-block; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; margin: 4px; }
                .cal-google { background: #4285F4; }
                .cal-ical { background: #1a73e8; }
                .cal-outlook { background: #0078D4; }
                .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">Ticket Confirmed!</h1>
                </div>
                <div class="content">
                  <p>Hi ${txData.attendeeName || "there"},</p>
                  <p>Your ticket for <strong>${gData?.title || "the event"}</strong> has been confirmed!</p>
                  <div class="event-card">
                    <p><strong>Event:</strong> ${gData?.title || "N/A"}</p>
                    <p><strong>Date:</strong> ${gData?.date || "N/A"}</p>
                    <p><strong>Time:</strong> ${gData?.time || "N/A"}</p>
                    <p><strong>Location:</strong> ${gData?.location || "N/A"}</p>
                    <p><strong>Ticket:</strong> ${totalAmount.toLocaleString()} RWF</p>
                    <p><strong>Hosted by:</strong> ${creatorName}</p>
                  </div>

                  <div style="text-align: center; margin: 24px 0;">
                    <p style="font-weight: bold; margin-bottom: 12px;">Your QR Code</p>
                    <img src="${qrSrc}" alt="Ticket QR Code" style="width: 180px; height: 180px; border-radius: 8px; border: 2px solid #e2e8f0;" />
                    <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Show this QR code at the venue for check-in</p>
                  </div>

                  <p style="text-align: center;">
                    <a href="${appUrl}/${txData.creatorId}/gatherings/${txData.gatheringId}" class="cta">View Your Ticket</a>
                  </p>

                  ${
                    googleCalUrl
                      ? `
                  <div style="text-align: center; margin: 24px 0;">
                    <p style="font-weight: bold; margin-bottom: 12px;">Add to Calendar</p>
                    <a href="${googleCalUrl}" target="_blank" class="cal-btn cal-google">Google Calendar</a>
                    <a href="data:text/calendar;charset=utf-8,${icsContent}" download="event.ics" class="cal-btn cal-ical">Apple iCal</a>
                    <a href="${outlookUrl}" target="_blank" class="cal-btn cal-outlook">Outlook</a>
                  </div>
                  `
                      : ""
                  }

                  <div class="footer">
                    <p>This email was sent by Agaseke Platform</p>
                    <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      console.log(
        `[GATHERING_PAYMENT] Ticket email sent successfully to ${txData.attendeeEmail} for ref ${txRef}`,
      );
    } catch (emailErr) {
      console.error(
        `[GATHERING_PAYMENT] Failed to send ticket email for ref ${txRef}:`,
        emailErr,
      );
      await adminDb.collection("activityLogs").add({
        level: "error",
        category: "payment",
        message: `Failed to send ticket email for ref ${txRef}`,
        metadata: {
          txRef,
          gatheringId: txData.gatheringId,
          attendeeEmail: txData.attendeeEmail,
          error: String(emailErr),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    console.log(
      `[GATHERING_PAYMENT] No attendeeEmail provided for ref ${txRef}, skipping ticket email`,
    );
  }

  console.log(`[GATHERING_PAYMENT] Completed for txRef=${txRef}`);
}
