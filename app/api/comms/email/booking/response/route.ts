/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function toISO(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildGoogleCalUrl(title: string, dateStr: string, startTime: string, endTime: string, location: string, description: string): string {
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toISO(start)}/${toISO(end)}`,
    details: description.substring(0, 1000),
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildYahooCalUrl(title: string, dateStr: string, startTime: string, endTime: string, location: string, description: string): string {
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  const params = new URLSearchParams({
    v: "60",
    title,
    st: toISO(start),
    et: toISO(end),
    desc: description.substring(0, 500),
    in_loc: location || "",
  });
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

function buildIcsDataUrl(title: string, dateStr: string, startTime: string, endTime: string, location: string, description: string, organizer: string): string {
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agaseke//Booking//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n").substring(0, 500)}`,
    location ? `LOCATION:${location}` : "",
    `ORGANIZER:${organizer}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export async function POST(request: NextRequest) {

  try {
    const { bookerEmail, bookerName, creatorName, status, bookingDate, bookingTime, note, meetingLocation, preferredType, tierName, creatorHandle } = await request.json();

    if (!bookerEmail || !bookerName || !creatorName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isAccepted = status === "accepted";
    const subject = isAccepted
      ? `Your booking with ${creatorName} is confirmed!`
      : `Update on your booking request with ${creatorName}`;

    // Parse time range for calendar links
    const timeParts = (bookingTime || "").split(" - ");
    const startTime = timeParts[0] || "";
    const endTime = timeParts[1] || "";

    const eventTitle = tierName
      ? `${tierName} — Meeting with ${creatorName}`
      : `Meeting with ${creatorName}`;

    const locationLabel = meetingLocation && preferredType === "physical"
      ? `<p><strong>Location:</strong> ${meetingLocation}</p>`
      : meetingLocation && preferredType === "online"
      ? `<p><strong>Online Link:</strong> <a href="${meetingLocation}" style="color: #f97316;">${meetingLocation}</a></p>`
      : "";

    const typeLabel = preferredType === "online"
      ? "Online Meeting"
      : preferredType === "physical"
      ? "In-Person Meeting"
      : "Meeting";

    const googleUrl = isAccepted ? buildGoogleCalUrl(eventTitle, bookingDate, startTime, endTime, meetingLocation || "", `Booking with ${creatorName} on ${bookingDate}`) : "#";
    const yahooUrl = isAccepted ? buildYahooCalUrl(eventTitle, bookingDate, startTime, endTime, meetingLocation || "", `Booking with ${creatorName} on ${bookingDate}`) : "#";
    const icsUrl = isAccepted ? buildIcsDataUrl(eventTitle, bookingDate, startTime, endTime, meetingLocation || "", `Booking with ${creatorName}\nDate: ${bookingDate}\nTime: ${bookingTime}`, creatorName) : "#";

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
            .cal-links { text-align: center; margin: 20px 0; }
            .cal-btn { display: inline-block; padding: 10px 18px; margin: 4px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; color: white; }
            .cal-btn.google { background: #4285f4; }
            .cal-btn.yahoo { background: #6001d2; }
            .cal-btn.ics { background: #1e293b; }
            .cal-btn:hover { opacity: 0.9; }
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
                <span class="status ${status}">${isAccepted ? "CONFIRMED" : "DECLINED"}</span>
              </div>
              
              ${isAccepted ? `
                <p>Great news! Your booking with <strong>${creatorName}</strong> has been confirmed.</p>
                
                <div class="details">
                  <p><strong>Type:</strong> ${typeLabel}</p>
                  <p><strong>Date:</strong> ${bookingDate}</p>
                  <p><strong>Time:</strong> ${bookingTime}</p>
                  ${locationLabel}
                  ${tierName ? `<p><strong>Tier:</strong> ${tierName}</p>` : ""}
                </div>
                
                ${meetingLocation && isAccepted ? `
                  <div class="cal-links">
                    <p style="font-weight: bold; margin-bottom: 10px;">Add to Calendar:</p>
                    <a href="${googleUrl}" target="_blank" class="cal-btn google">Google Calendar</a>
                    <a href="${yahooUrl}" target="_blank" class="cal-btn yahoo">Yahoo Calendar</a>
                    <a href="${icsUrl}" class="cal-btn ics">Apple / Outlook</a>
                  </div>
                ` : ""}
                
                ${note ? `<div class="note"><strong>Message from ${creatorName}:</strong><br>${note}</div>` : ""}
                
                <p style="margin-top: 16px;">Please make sure to:</p>
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

    await transporter.sendMail({
      from: `"Agaseke" <${process.env.SMTP_USER}>`,
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
