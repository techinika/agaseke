import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const {
      creatorEmail,
      supporterName,
      message,
      chatroomUrl,
    } = await req.json();

    if (!creatorEmail || !supporterName || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const mailOptions = {
      from: `"Agaseke" <${process.env.EMAIL_USER}>`,
      to: creatorEmail,
      subject: `New message from ${supporterName} on Agaseke`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ea580c; margin: 0;">agaseke.me</h1>
          </div>
          
          <div style="background: #fff7ed; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">
              New Message Received
            </h2>
            
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              <strong style="color: #1f2937;">${supporterName}</strong> sent you a message on Agaseke:
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #ea580c; margin-bottom: 20px;">
              <p style="color: #1f2937; margin: 0; font-style: italic; line-height: 1.6;">
                &quot;${message.length > 200 ? message.substring(0, 200) + "..." : message}&quot;
              </p>
            </div>
            
            <a href="${chatroomUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Reply to Message
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            You received this email because someone sent you a message on Agaseke.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
