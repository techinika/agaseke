/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { transporter } from "@/lib/emailTransporter";
import { adminDb, admin } from "@/db/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { supporterEmail, supporterName, creatorName, eventTitle, eventDate, eventLocation, eventTime } = await request.json();

    if (!supporterEmail || !supporterName || !creatorName || !eventTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`[GATHERING_EMAIL_CHECKIN] Sending to ${supporterEmail} for "${eventTitle}"`);

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #22c55e; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
      .checkmark { width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
      .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="checkmark">
          <svg width="30" height="30" fill="#22c55e" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        <h1 style="margin: 0; font-size: 24px;">You&apos;re Checked In!</h1>
      </div>
      <div class="content">
        <p>Hi ${supporterName},</p>
        
        <p>Great news! You&apos;ve been checked in to:</p>
        
        <div class="event-card">
          <h2 style="margin: 0 0 15px 0; color: #f97316;">${eventTitle}</h2>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${eventDate}</p>
          ${eventTime ? `<p style="margin: 8px 0;"><strong>Time:</strong> ${eventTime}</p>` : ""}
          <p style="margin: 8px 0;"><strong>Location:</strong> ${eventLocation || "See creator for details"}</p>
        </div>
        
        <p>Enjoy the event! We hope you have a great time.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${creatorName}</strong>
        </p>
      </div>
      <div class="footer">
        <p>This email was sent by Agaseke Platform</p>
        <p>&copy; ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
`;

    await transporter.sendMail({
      from: `"Agaseke" <${process.env.SMTP_USER}>`,
      to: supporterEmail,
      subject: `Checked In: ${eventTitle}`,
      html: emailHtml,
    });

    console.log(`[GATHERING_EMAIL_CHECKIN] Check-in email sent to ${supporterEmail} for "${eventTitle}"`);
    await adminDb.collection("activityLogs").add({
      level: "info",
      category: "gathering",
      message: `Check-in email sent to ${supporterEmail} for "${eventTitle}"`,
      metadata: { supporterEmail, supporterName, eventTitle },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[GATHERING_EMAIL_CHECKIN] Failed to send check-in email:`, error);
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "gathering",
      message: `Failed to send check-in email`,
      metadata: { error: String(error) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}