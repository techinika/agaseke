import { transporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { recipients, subject, message, targetLabel } = await req.json();
    let sentCount = 0;
    let failedCount = 0;

    // Send emails individually for personalization
    const emailPromises = recipients.map(async (user: any) => {
      try {
        // Replace placeholders with real data
        const personalizedMessage = message
          .replace(/\[NAME\]/g, user.name || "there")
          .replace(/\[HANDLE\]/g, user.handle || "");

        const htmlTemplate = `
          <div style="font-family: sans-serif; background-color: #f4f4f7; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #ea580c; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">AGASEKE</h1>
              </div>
              <div style="padding: 40px; color: #334155; line-height: 1.6;">
                ${personalizedMessage.replace(/\n/g, "<br/>")}
              </div>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"Agaseke Updates" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: subject,
          html: htmlTemplate,
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err);
        failedCount++;
      }
    });

    await Promise.all(emailPromises);

    // LOG TO FIRESTORE
    await addDoc(collection(db, "adminBroadcasts"), {
      subject,
      message,
      targetLabel,
      recipientsCount: recipients.length,
      sentCount,
      failedCount,
      sentAt: serverTimestamp(),
      status: failedCount === 0 ? "success" : "partial_failure",
    });

    return NextResponse.json({ success: true, sentCount, failedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
