import { transporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, name, approved, reason } = await req.json();

    const statusColor = approved ? "#059669" : "#DC2626";
    const statusTitle = approved ? "Account Verified" : "Verification Update";

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6; background-color: #F8FAFC; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #E2E8F0;">
          
          <div style="background-color: ${statusColor}; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${statusTitle}</h1>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
            
            ${
              approved
                ? `
              <p>Great news! Your identity verification has been <strong>approved</strong>. Your profile now features the verification badge, which helps build trust with your supporters.</p>
              <p>You can now receive payouts at the end of the month and enjoy full access to all Agaseke features.</p>
            `
                : `
              <p>Thank you for submitting your verification request. Unfortunately, we were <strong>unable to verify</strong> your account at this time.</p>
              
              <div style="background-color: #FEF2F2; border: 1px solid #FEE2E2; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #991B1B; font-size: 14px;">
                  <strong>Reason:</strong> ${reason || "The information provided does not match our requirements or the ID document was unclear."}
                </p>
              </div>

              <p>Don't worry! You can try again. Please double-check your National ID details and ensure the photo is clear and legible before resubmitting.</p>
            `
            }

            <div style="text-align: center; margin-top: 35px;">
              <a href="https://agaseke.me/creator/verify" style="background-color: #0F172A; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; display: inline-block; letter-spacing: 1px;">
                ${approved ? "GO TO DASHBOARD" : "RESUBMIT INFO"}
              </a>
            </div>
          </div>
          
          <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #F1F5F9;">
            <p style="font-size: 12px; color: #94A3B8; margin: 0;">If you have questions, reply to this email or reach out on WhatsApp.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Agaseke Verification" <${process.env.SMTP_USER}>`,
      to: email,
      subject: approved
        ? "✅ Agaseke Verification Successful"
        : "⚠️ Action Required: Agaseke Verification Update",
      html: emailHtml,
    });

    return NextResponse.json(
      { message: "Feedback email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Verification Email Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
