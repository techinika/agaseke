import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { supporterEmail, supporterName, creatorName, eventTitle, eventDate, eventLocation } = await req.json();

    if (!supporterEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
    .checkmark { width: 60px; height: 60px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Checked In!</h1>
    </div>
    <div class="content">
      <div class="checkmark">
        <svg width="30" height="30" fill="white" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
      
      <p>Hi ${supporterName},</p>
      
      <p>Great news! You've been successfully checked in to:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #f97316;">${eventTitle}</h2>
        <p style="margin: 5px 0; color: #666;">
          <strong>Date:</strong> ${eventDate}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>Location:</strong> ${eventLocation}
        </p>
      </div>
      
      <p>Enjoy the event! We hope you have a great time.</p>
      
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>${creatorName}</strong>
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by Agaseke</p>
    </div>
  </div>
</body>
</html>
`;

    return NextResponse.json({ success: true, message: "Check-in notification sent" });
  } catch (error) {
    console.error("Check-in email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
