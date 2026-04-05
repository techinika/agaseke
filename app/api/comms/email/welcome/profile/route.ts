import { founderTransporter } from "@/lib/emailTransporter";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
        <div style="padding: 40px 20px; text-align: center; background-color: #ea580c; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -1px;">Welcome to Agaseke!</h1>
        </div>
        
        <div style="padding: 40px 30px; background-color: #ffffff; border: 1px solid #f1f5f9; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
          
          <p>I’m Songa, the founder of Agaseke. I wanted to personally reach out and thank you for joining our community.</p>
          
          <p>We built Agaseke with one mission: <strong>to ensure every creator has a real chance to earn from their passion.</strong> Whether you are sharing art, knowledge, or experiences, Agaseke is designed to help you offer more value to your fans while getting paid voluntarily for your work by fans who love what you do.</p>

          <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h3 style="color: #9a3412; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Quick Start Guide:</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #431407;">
              <li><strong><a href="${process.env.NEXT_PUBLIC_BASE_URL}/onboarding">Setup your Creator Profile</a>:</strong> Create your creator profile with unique username to start receiving support.</li>
              <li><strong>Offer Incentives:</strong> You can host private gatherings with your supporters, offer exclusive content, or sell merchs to your supporter as an incentive, all through Agaseke.</li>
              <li><strong>Verification:</strong> Get verified to build trust and unlock payouts.</li>
            </ul>
          </div>

          <p>I can't wait to see what you create. If you have any questions, just hit reply. My team and I are here to help.</p>

          <p>You can also join our WhatsApp community for quick assistance. <a href="https://chat.whatsapp.com/DSLKCybSApGKrEmn0HvlLx">Click here</a> to join.</p>
          
          <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; pt-20px;">
            <p style="margin-bottom: 0;">Warm regards,</p>
            <p style="font-size: 12px; color: #94a3b8;">Songa,<br>Founder, Agaseke</p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8;">
          &copy; 2026 Agaseke. Supporting the Creator Economy in Rwanda.
        </div>
      </div>
    `;

    await founderTransporter.sendMail({
      from: `"Songa from Agaseke" <${process.env.SMTP_FOUNDER}>`,
      to: email,
      subject: "Welcome to Agaseke - Start Earning from Your Work! ",
      html: emailHtml,
    });

    return NextResponse.json(
      { message: "Welcome email sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
