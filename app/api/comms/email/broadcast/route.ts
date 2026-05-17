import {  updatesTransporter } from "@/lib/emailTransporter";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: NextRequest) {
  try {
    const { recipients, subject, message, targetLabel, recipientIds } = await req.json();
    let sentCount = 0;
    let failedCount = 0;

    const BATCH_SIZE = 50;
    
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emailPromises = batch.map(async (user: any) => {
        try {
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

          await updatesTransporter.sendMail({
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
    }

    if (recipientIds && recipientIds.length > 0) {
      for (let i = 0; i < recipientIds.length; i += 500) {
        const batch = adminDb.batch();
        const chunk = recipientIds.slice(i, i + 500);
        chunk.forEach((userId: string) => {
          const ref = adminDb.collection("notifications").doc();
          batch.set(ref, {
            userId,
            type: "broadcast_received",
            title: subject,
            message: message.substring(0, 200) + (message.length > 200 ? "..." : ""),
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
              targetLabel,
              recipientsCount: recipients.length,
            },
          });
        });
        await batch.commit();
      }
    }

    await adminDb.collection("adminBroadcasts").add({
      subject,
      message,
      targetLabel,
      recipientsCount: recipients.length,
      sentCount,
      failedCount,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: failedCount === 0 ? "success" : "partial_failure",
    });

    await adminDb.collection("notifications").add({
      userId: "admin",
      type: failedCount === 0 ? "broadcast_received" : "withdrawal",
      title: failedCount === 0 ? `Broadcast Successful: ${subject}` : `Broadcast Partial Failure: ${subject}`,
      message: `Sent to ${sentCount} users. ${failedCount > 0 ? `${failedCount} failed.` : ""} Target: ${targetLabel}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        targetLabel,
        recipientsCount: recipients.length,
        sentCount,
        failedCount,
        isAdminNotification: true,
      },
    });

    return NextResponse.json({ success: true, sentCount, failedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
