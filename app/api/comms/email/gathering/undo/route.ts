/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { transporter } from "@/lib/emailTransporter";
import { adminDb, admin } from "@/db/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { supporterEmail, supporterName, creatorName, eventTitle, eventDate, action } = await request.json();

    if (!supporterEmail || !supporterName || !creatorName || !eventTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isUndoFromCheckIn = action === "undo_checkin";
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #64748b; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
      .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">Check-in Status Updated</h1>
      </div>
      <div class="content">
        <p>Hi ${supporterName},</p>
        
        <p><strong>${creatorName}</strong> has updated your check-in status for:</p>
        
        <div class="details">
          <p><strong>Event:</strong> ${eventTitle}</p>
          <p><strong>Date:</strong> ${eventDate}</p>
          <p><strong>New Status:</strong> ${isUndoFromCheckIn ? "Pending (check-in reverted)" : "Pending"}</p>
        </div>
        
        <p>Please check in again at the event if you&apos;d still like to attend.</p>
        
        <div class="footer">
          <p>This email was sent by Agaseke Platform</p>
          <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

    await transporter.sendMail({
      from: `"Agaseke" <${process.env.SMTP_USER}>`,
      to: supporterEmail,
      subject: `Check-in Status Updated: ${eventTitle}`,
      html: emailHtml,
    });

    console.log(`[GATHERING_EMAIL_UNDO] Undo email sent to ${supporterEmail} for "${eventTitle}"`);
    await adminDb.collection("activityLogs").add({
      level: "info",
      category: "gathering",
      message: `Undo email sent to ${supporterEmail} for "${eventTitle}"`,
      metadata: { supporterEmail, supporterName, eventTitle },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[GATHERING_EMAIL_UNDO] Failed to send undo email:`, error);
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "gathering",
      message: `Failed to send undo email`,
      metadata: { error: String(error) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}