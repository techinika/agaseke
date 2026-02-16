import { transporter } from "@/lib/emailTransporter";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, handle } = await req.json();

    const profileUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${handle}`;
    const whatsappLink = "https://chat.whatsapp.com/DSLKCybSApGKrEmn0HvlLx";

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <div style="background-color: #ea580c; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">You're Live!</h1>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Amazing news, <strong>${name}</strong>!</p>
            
            <p style="font-size: 16px; color: #475569;">Your Agaseke creator profile is officially live. This is the first step toward building a sustainable community and earning from your creative work. </p>

            <div style="text-align: center; margin: 20px 0;">
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">Your Public Link:</p>
              <a href="${profileUrl}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: 0.5px;">VIEW YOUR PROFILE</a>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 20px; border-radius: 16px;">
              <h4 style="color: #166534; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
                For Quick Support
              </h4>
              <p style="font-size: 14px; color: #166534; margin: 0 0 15px 0;">
                Join our <strong>WhatsApp Community</strong> for instant assistance, feedback from other creators, and platform updates.
              </p>
              <a href="${whatsappLink}" style="color: #15803d; font-weight: bold; text-decoration: underline; font-size: 14px;">Join the WhatsApp Group &rarr;</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
              <strong>Pro Tip:</strong> Share your profile link on your Instagram bio or X(Twitter) to let your fans know they can now support you!
            </p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent with ❤️ from the Agaseke Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Agaseke for Creators" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your creator profile is now live!",
      html: emailHtml,
    });

    return NextResponse.json({ message: "Launch email sent" }, { status: 200 });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
