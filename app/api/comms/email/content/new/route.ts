import { updatesTransporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { logActivity } from "@/lib/adminLogger";

interface NewContentNotification {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  contentTitle: string;
  contentDescription?: string;
  contentType: "public" | "private";
  contentId: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      creatorId,
      creatorName,
      creatorHandle,
      contentTitle,
      contentDescription,
      contentType,
      contentId,
    }: NewContentNotification = await req.json();

    if (!creatorId || !creatorName || !contentTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get all supporters of this creator
    const supportsSnap = await adminDb.collection("supportedCreators").where("creatorId", "==", creatorId).get();

    if (supportsSnap.empty) {
      return NextResponse.json({
        success: true,
        message: "No supporters to notify",
        sentCount: 0,
      });
    }

    // Get supporter emails from profiles
    const supporterIds = supportsSnap.docs.map((doc) => doc.data().supporterId);
    const profilesSnap = await adminDb.collection("profiles").where("uid", "in", supporterIds.slice(0, 10)).get();

    const supporters = profilesSnap.docs
      .map((doc) => doc.data())
      .filter((p) => p.email);

    let sentCount = 0;
    let failedCount = 0;

    // Send emails to supporters
    for (const supporter of supporters) {
      try {
        const htmlTemplate = `
          <div style="font-family: sans-serif; background-color: #f4f4f7; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #ea580c; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">AGASEKE</h1>
              </div>
              <div style="padding: 40px; color: #334155; line-height: 1.6;">
                <h2 style="color: #1f2937; margin-top: 0;">
                  ${contentType === "private" ? "Exclusive Content Available!" : "New Content Alert!"}
                </h2>
                <p>Hi ${supporter.displayName || "there"},</p>
                <p>
                  <strong>${creatorName}</strong> just posted new content on Agaseke!
                </p>
                
                <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">${contentTitle}</h3>
                  ${contentDescription ? `<p style="margin: 0; color: #6b7280;">${contentDescription}</p>` : ""}
                  ${contentType === "private" ? `<p style="margin: 10px 0 0 0; color: #ea580c; font-weight: bold;">Exclusive Content for Supporters</p>` : ""}
                </div>
                
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/${creatorHandle}" 
                   style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                  View Content
                </a>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  You're receiving this because you support ${creatorName} on Agaseke.
                </p>
              </div>
            </div>
          </div>
        `;

        await updatesTransporter.sendMail({
          from: `"Agaseke Updates" <${process.env.SMTP_USER}>`,
          to: supporter.email,
          subject: `New content from ${creatorName} on Agaseke!`,
          html: htmlTemplate,
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${supporter.email}:`, error);
        failedCount++;
      }
    }

    await logActivity({
      level: "success",
      category: "support",
      message: `New content notification sent: "${contentTitle}" by ${creatorName} to ${sentCount} supporters`,
      creatorId,
      creatorHandle,
      metadata: {
        contentId,
        contentType,
        sentCount,
        failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalSupporters: supportsSnap.size,
    });
  } catch (error: any) {
    console.error("New content notification error:", error);
    await logActivity({
      level: "error",
      category: "support",
      message: `Failed to send new content notification: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
