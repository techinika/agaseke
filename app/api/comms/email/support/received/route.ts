import { transporter } from "@/lib/emailTransporter";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { creatorEmail, creatorName, supporterName, amount, message } =
      await req.json();

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6; background-color: #F8FAFC; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <div style="background: linear-gradient(to right, #EA580C, #F97316); padding: 50px 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Support Received!</h1>
          </div>
          
          <div style="padding: 40px 30px; text-align: center;">
            <p style="font-size: 18px; color: #475569; margin: 0;">Hey ${creatorName},</p>

            <h2 style="font-size: 32px; font-weight: 900; color: #0F172A; margin: 10px 0;">${amount.toLocaleString()} RWF</h2>
            <p style="font-size: 16px; color: #64748B;">from <strong>${supporterName || "A generous supporter"}</strong></p>

            ${
              message
                ? `
              <div style="margin-top: 30px; padding: 25px; background-color: #F1F5F9; border-radius: 16px; position: relative; text-align: left;">
                <span style="font-size: 40px; color: #CBD5E1; position: absolute; top: 10px; left: 15px; font-family: Georgia, serif;">&ldquo;</span>
                <p style="margin: 0; font-style: italic; color: #334155; font-size: 15px; padding-left: 20px; position: relative; z-index: 1;">
                  ${message}
                </p>
              </div>
            `
                : ""
            }

            <div style="margin-top: 40px;">
              <p style="font-size: 15px; color: #475569;">Success breeds success! Keep sharing your link to give more fans a chance to support your journey.</p>
              <a href="https://agaseke.me/creator" style="display: inline-block; margin-top: 20px; background-color: #EA580C; color: #ffffff; padding: 16px 35px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Manage Your Account</a>
            </div>
          </div>
          
          <div style="background-color: #F8FAFC; padding: 25px; text-align: center; border-top: 1px solid #F1F5F9;">
            <p style="font-size: 12px; color: #94A3B8; margin: 0;">You're doing great! Join the creator community on WhatsApp for more tips.</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent with ❤️ from the Agaseke Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Agaseke Alerts" <${process.env.NEXT_PUBLIC_BASE_URL}>`,
      to: creatorEmail,
      subject: `You just received ${amount} RWF on Agaseke!`,
      html: emailHtml,
    });

    return NextResponse.json({ message: "Notification sent" }, { status: 200 });
  } catch (error) {
    console.error("Support Email Error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}
