import { updatesTransporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";
import { logActivity } from "@/lib/adminLogger";

export async function POST(req: NextRequest) {
  try {
    const {
      creatorId,
      creatorName,
      creatorHandle,
      gatheringId,
      gatheringTitle,
      gatheringDate,
      gatheringTime,
      gatheringLocation,
      gatheringDescription,
    } = await req.json();

    if (!creatorId || !creatorName || !gatheringTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get all supporters of this creator (creatorId in supportedCreators is the handle/username)
    const supportsSnap = await adminDb.collection("supportedCreators").where("creatorId", "==", creatorHandle).get();

    let supporterSentCount = 0;
    let supporterFailedCount = 0;

    if (!supportsSnap.empty) {
      const supporterIds = supportsSnap.docs.map((doc) => doc.data().supporterId);
      const profilesSnap = await adminDb.collection("profiles").where("uid", "in", supporterIds.slice(0, 10)).get();

      const supporters = profilesSnap.docs.map((doc) => doc.data()).filter((p) => p.email);

      for (const supporter of supporters) {
        try {
          const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #ea580c; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
      .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">New Event Announced!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${creatorName} is hosting a gathering</p>
      </div>
      <div class="content">
        <p>Hi ${supporter.displayName || "there"},</p>
        <p><strong>${creatorName}</strong> just announced a new gathering on Agaseke!</p>

        <div class="event-card">
          <h2 style="margin: 0 0 15px 0; color: #f97316;">${gatheringTitle}</h2>
          ${gatheringDescription ? `<p style="margin: 0 0 15px 0; color: #6b7280;">${gatheringDescription}</p>` : ""}
          <p style="margin: 8px 0;"><strong>Date:</strong> ${gatheringDate}</p>
          ${gatheringTime ? `<p style="margin: 8px 0;"><strong>Time:</strong> ${gatheringTime}</p>` : ""}
          ${gatheringLocation ? `<p style="margin: 8px 0;"><strong>Location:</strong> ${gatheringLocation}</p>` : ""}
        </div>

        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/${creatorHandle}/gatherings/${gatheringId}"
           style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">
          RSVP Now
        </a>

        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          You're receiving this because you support ${creatorName} on Agaseke.
        </p>
      </div>
      <div class="footer">
        <p>This email was sent by Agaseke Platform</p>
        <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;

          await updatesTransporter.sendMail({
            from: `"Agaseke Updates" <${process.env.SMTP_USER}>`,
            to: supporter.email,
            subject: `New gathering: ${gatheringTitle} by ${creatorName}`,
            html: emailHtml,
          });
          supporterSentCount++;
        } catch (error) {
          console.error(`Failed to send gathering email to ${supporter.email}:`, error);
          supporterFailedCount++;
        }
      }
    }

    // Create in-app notifications for supporters
    if (!supportsSnap.empty) {
      const supporterIds = supportsSnap.docs.map((doc) => doc.data().supporterId);
      const notificationsBatch = adminDb.batch();
      supporterIds.slice(0, 10).forEach((supporterId) => {
        const notifRef = adminDb.collection("notifications").doc();
        notificationsBatch.set(notifRef, {
          userId: supporterId,
          type: "new_gathering",
          title: "New Gathering Announced!",
          message: `${creatorName} just posted a new gathering: "${gatheringTitle}"`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          link: `/${creatorHandle}/gatherings/${gatheringId}`,
          actorName: creatorName,
          actorId: creatorId,
        });
      });
      await notificationsBatch.commit();
    }

    await logActivity({
      level: "success",
      category: "support",
      message: `Gathering created notification sent: "${gatheringTitle}" by ${creatorName} to ${supporterSentCount} supporters`,
      creatorId,
      creatorHandle,
      metadata: { gatheringId, supporterSentCount, supporterFailedCount },
    });

    return NextResponse.json({ success: true, supporterSentCount, supporterFailedCount });
  } catch (error: any) {
    console.error("Gathering created notification error:", error);
    await logActivity({
      level: "error",
      category: "support",
      message: `Failed to send gathering created notification: ${error.message}`,
      metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
