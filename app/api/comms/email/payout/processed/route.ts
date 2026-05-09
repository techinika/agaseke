import { updatesTransporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/adminLogger";

export async function POST(req: NextRequest) {
  try {
    const { creatorEmail, creatorName, amount, method, accountNumber } = await req.json();

    if (!creatorEmail || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const htmlTemplate = `
      <div style="font-family: sans-serif; background-color: #f4f4f7; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #ea580c; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">AGASEKE</h1>
          </div>
          <div style="padding: 40px; color: #334155; line-height: 1.6;">
            <h2 style="color: #1f2937; margin-top: 0;">Payout Processed!</h2>
            <p>Hi ${creatorName || "Creator"},</p>
            <p>Great news! Your withdrawal request has been approved and the payout is being processed.</p>
            
            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px;">${amount.toLocaleString()} RWF</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Method</td>
                  <td style="padding: 8px 0; text-align: right; font-size: 14px;">${method || "Mobile Money"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Account</td>
                  <td style="padding: 8px 0; text-align: right; font-size: 14px;">${accountNumber || "N/A"}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              The funds should arrive in your account within 1-2 business days depending on your payment provider.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Keep creating amazing content and building your community!
            </p>
            
            <p style="margin-top: 30px;">
              Best regards,<br/>
              <strong>The Agaseke Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    await updatesTransporter.sendMail({
      from: `"Agaseke Payouts" <${process.env.SMTP_USER}>`,
      to: creatorEmail,
      subject: "Your Payout Has Been Processed! - Agaseke",
      html: htmlTemplate,
    });

    await logActivity({
      level: "success",
      category: "payout",
      message: `Payout email sent to ${creatorEmail} for ${amount.toLocaleString()} RWF`,
      userEmail: creatorEmail,
      userName: creatorName,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payout email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
