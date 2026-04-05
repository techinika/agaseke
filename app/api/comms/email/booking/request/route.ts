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
    const { creatorEmail, creatorName, bookerName, bookerEmail, reason, preferredDate, preferredTime, preferredType } = await request.json();

    if (!creatorEmail || !creatorName || !bookerName || !bookerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailHtml = `
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
            .cta.accept { background: #22c55e; }
            .cta.decline { background: #ef4444; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
            </div>
            <div class="content">
              <p>Hi ${creatorName},</p>
              
              <p><strong>${bookerName}</strong> has requested to book a meeting with you!</p>
              
              <div class="booking-card">
                <p><strong>👤 Name:</strong> ${bookerName}</p>
                <p><strong>📧 Email:</strong> ${bookerEmail}</p>
                <p><strong>📅 Date:</strong> ${preferredDate || "Not specified"}</p>
                <p><strong>🕐 Time:</strong> ${preferredTime || "Not specified"}</p>
                <p><strong>📍 Type:</strong> ${preferredType === "online" ? "Online" : preferredType === "physical" ? "In Person" : "Either"}</p>
              </div>
              
              ${reason ? `
                <div class="reason">
                  <strong>Message from ${bookerName}:</strong><br>
                  ${reason}
                </div>
              ` : ""}
              
              <p>Please log in to your dashboard to accept or decline this request.</p>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://agaseke.com"}/creator/bookings" class="cta">
                  Manage Bookings
                </a>
              </div>
              
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
      to: creatorEmail,
      subject: `New booking request from ${bookerName}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking request email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
