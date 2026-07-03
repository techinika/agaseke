import { transporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";
import { logActivity } from "@/lib/adminLogger";

export async function POST(req: NextRequest) {
  try {
    const {
      supporterName,
      supporterEmail,
      creatorHandle,
      creatorId,
      gatheringId,
      gatheringTitle,
      gatheringDate,
      gatheringTime,
    } = await req.json();

    if (!supporterName || !creatorHandle || !gatheringTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get creator's email from their profile
    const creatorProfileSnap = await adminDb.collection("profiles").where("uid", "==", creatorId).get();
    let creatorEmail = "";
    let creatorDisplayName = creatorHandle;
    creatorProfileSnap.forEach((doc) => {
      const data = doc.data();
      creatorEmail = data.email || "";
      creatorDisplayName = data.displayName || creatorHandle;
    });

    // Get creator's handle to look up their name
    const creatorSnap = await adminDb.collection("creators").doc(creatorHandle).get();
    const creatorName = creatorSnap.exists ? (creatorSnap.data()?.name || creatorDisplayName) : creatorDisplayName;

    if (creatorEmail) {
      const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #ea580c; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
      .rsvp-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">New RSVP Received!</h1>
      </div>
      <div class="content">
        <p>Hi ${creatorName},</p>

        <p><strong>${supporterName}</strong> has RSVP&apos;d to your gathering!</p>

        <div class="rsvp-card">
          <h2 style="margin: 0 0 15px 0; color: #22c55e;">${gatheringTitle}</h2>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${gatheringDate}</p>
          ${gatheringTime ? `<p style="margin: 8px 0;"><strong>Time:</strong> ${gatheringTime}</p>` : ""}
          <p style="margin: 8px 0;"><strong>Guest:</strong> ${supporterName} ${supporterEmail ? `(${supporterEmail})` : ""}</p>
        </div>

        <p>Check your dashboard to manage attendees and prepare for the event.</p>

        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/creator/gatherings"
           style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">
          View Dashboard
        </a>
      </div>
      <div class="footer">
        <p>This email was sent by Agaseke Platform</p>
        <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;

      await transporter.sendMail({
        from: `"Agaseke" <${process.env.SMTP_USER}>`,
        to: creatorEmail,
        subject: `New RSVP: ${supporterName} for "${gatheringTitle}"`,
        html: emailHtml,
      });
    }

    // Create in-app notification for creator
    await adminDb.collection("notifications").add({
      userId: creatorId,
      type: "new_gathering",
      title: "New RSVP Received!",
      message: `${supporterName} RSVP'd to "${gatheringTitle}"`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      link: "/creator/gatherings",
      actorName: supporterName,
      metadata: { gatheringId, gatheringTitle },
    });

    console.log(`[GATHERING_EMAIL_RSVP] Notified ${creatorName} that ${supporterName} RSVP'd to "${gatheringTitle}"`);
    await logActivity({
      level: "success",
      category: "gathering",
      message: `RSVP notification sent to ${creatorName} for gathering "${gatheringTitle}" from ${supporterName}`,
      creatorId: creatorId,
      creatorHandle,
      metadata: { gatheringId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[GATHERING_EMAIL_RSVP] Error sending RSVP notification:`, error);
    await logActivity({
      level: "error",
      category: "gathering",
      message: `Failed to send RSVP notification: ${error.message}`,
      metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
