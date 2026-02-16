import { transporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { emails, subject, message, targetLabel } = await req.json();

    const htmlTemplate = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #ea580c; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 2px; font-size: 24px;">Agaseke</h1>
          </div>
          <div style="padding: 40px; color: #334155;">
            <div style="line-height: 1.6; font-size: 16px;">
              ${message.replace(/\n/g, "<br/>")}
            </div>

          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent with ❤️ from the Agaseke Team</p>
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              This update was sent to our ${targetLabel} community.<br/>
              © 2026 Agaseke for Creators. All rights reserved.
            </p>
      </div>
    `;

    // Sending emails in BCC to hide recipient list and for efficiency
    await transporter.sendMail({
      from: `"Agaseke Updates" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      bcc: emails,
      subject: subject,
      html: htmlTemplate,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
