/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const { bookerEmail, bookerName, creatorName, status, bookingDate, bookingTime, note } = await request.json();

    if (!bookerEmail || !bookerName || !creatorName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isAccepted = status === "accepted";
    const subject = isAccepted
      ? `Your booking with ${creatorName} is confirmed!`
      : `Update on your booking request with ${creatorName}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .status { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .status.accepted { background: #22c55e; color: white; }
            .status.declined { background: #ef4444; color: white; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details p { margin: 8px 0; }
            .note { background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${isAccepted ? "Booking Confirmed!" : "Booking Update"}</h1>
            </div>
            <div class="content">
              <p>Hi ${bookerName},</p>
              
              <div style="text-align: center;">
                <span class="status ${status}">${isAccepted ? "✓ CONFIRMED" : "✗ DECLINED"}</span>
              </div>
              
              ${isAccepted ? `
                <p>Great news! Your booking with <strong>${creatorName}</strong> has been confirmed.</p>
                
                <div class="details">
                  <p><strong>📅 Date:</strong> ${bookingDate}</p>
                  <p><strong>🕐 Time:</strong> ${bookingTime}</p>
                </div>
                
                ${note ? `<div class="note"><strong>Message from ${creatorName}:</strong><br>${note}</div>` : ""}
                
                <p>Please make sure to:</p>
                <ul>
                  <li>Be on time for your meeting</li>
                  <li>Check your email for any additional instructions</li>
                </ul>
              ` : `
                <p>Unfortunately, <strong>${creatorName}</strong> is unable to accommodate your booking request at this time.</p>
                
                ${note ? `<div class="note"><strong>Message from ${creatorName}:</strong><br>${note}</div>` : ""}
                
                <p>You can try booking a different time slot or contact ${creatorName} directly if you have any questions.</p>
              `}
              
              <div class="footer">
                <p>This email was sent by Agaseke Platform</p>
                <p>© ${new Date().getFullYear()} Agaseke. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: "Agaseke <noreply@agaseke.com>",
      to: bookerEmail,
      subject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking response email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
