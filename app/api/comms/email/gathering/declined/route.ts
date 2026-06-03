/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb, admin } from "@/db/firebaseAdmin";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { supporterEmail, supporterName, creatorName, eventTitle, eventDate, eventLocation, note } = await request.json();

    if (!supporterEmail || !supporterName || !creatorName || !eventTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
      .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
      .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">Check-in Declined</h1>
      </div>
      <div class="content">
        <p>Hi ${supporterName},</p>
        
        <p><strong>${creatorName}</strong> was unable to check you in to their event.</p>
        
        <div class="details">
          <p><strong>Event:</strong> ${eventTitle}</p>
          <p><strong>Date:</strong> ${eventDate}</p>
        </div>
        
        ${note ? `<p><strong>Note from ${creatorName}:</strong> ${note}</p>` : ""}
        
        <p>If you have any questions, please contact ${creatorName} directly.</p>
        
        <div class="footer">
          <p>This email was sent by Agaseke Platform</p>
          <p>© ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

    await transporter.sendMail({
      from: `"Agaseke" <${process.env.SMTP_USER}>`,
      to: supporterEmail,
      subject: `Check-in Update for ${eventTitle}`,
      html: emailHtml,
    });

    console.log(`[GATHERING_EMAIL_DECLINED] Declined email sent to ${supporterEmail} for "${eventTitle}"`);
    await adminDb.collection("activityLogs").add({
      level: "info",
      category: "gathering",
      message: `Declined email sent to ${supporterEmail} for "${eventTitle}"`,
      metadata: { supporterEmail, supporterName, eventTitle },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[GATHERING_EMAIL_DECLINED] Failed to send declined email:`, error);
    await adminDb.collection("activityLogs").add({
      level: "error",
      category: "gathering",
      message: `Failed to send declined email`,
      metadata: { error: String(error) },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}