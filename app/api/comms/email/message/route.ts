import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/db/firebaseAdmin";

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
      creatorId,
      creatorName,
      supporterName,
      message,
      chatroomId,
      chatroomUrl,
    } = await req.json();

    if (!supporterName || !message || !chatroomId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve creator email from profiles
    let creatorEmail = "";
    let resolvedCreatorName = creatorName || "Creator";
    if (creatorId) {
      try {
        // profiles document ID is the Firebase UID; try direct lookup first
        let profileSnap = await adminDb.collection("profiles").doc(creatorId).get();
        if (!profileSnap.exists) {
          // Fallback: if creatorId is a handle/username, query profiles by username field
          const q = await adminDb.collection("profiles").where("username", "==", creatorId).limit(1).get();
          if (!q.empty) profileSnap = q.docs[0];
        }
        if (profileSnap.exists) {
          const profileData = profileSnap.data();
          creatorEmail = profileData?.email || "";
          resolvedCreatorName = profileData?.displayName || profileData?.name || creatorName || "Creator";
        }
      } catch (err) {
        console.error("[MESSAGE_EMAIL] Failed to fetch profile:", err);
      }
    }

    if (!creatorEmail) {
      console.log(`[MESSAGE_EMAIL] No email resolved for creatorId="${creatorId}", skipping`);
      return NextResponse.json({ success: false, reason: "no_email" });
    }

    // Check last notification time for hourly digest logic
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    let shouldSend = true;
    let isDigest = false;
    let unreadCount = 1;

    try {
      const chatroomSnap = await adminDb.collection("chatrooms").doc(chatroomId).get();
      if (chatroomSnap.exists) {
        const chatroomData = chatroomSnap.data();
        const lastNotifiedAt = chatroomData?.lastNotifiedAt?.toMillis?.() || 0;
        const timeSinceLastNotified = now - lastNotifiedAt;

        if (lastNotifiedAt > 0 && timeSinceLastNotified < ONE_HOUR) {
          console.log(`[MESSAGE_EMAIL] Last notified ${Math.round(timeSinceLastNotified / 1000 / 60)}m ago (<1hr), suppressing email for "${supporterName}"`);
          return NextResponse.json({ success: true, suppressed: true, reason: "hourly_throttle" });
        }

        // Count unread messages for digest content
        if (lastNotifiedAt > 0 && timeSinceLastNotified >= ONE_HOUR) {
          isDigest = true;
          try {
            const messagesRef = adminDb.collection("chatrooms").doc(chatroomId).collection("messages");
            const unreadSnap = await messagesRef.where("read", "==", false).get();
            unreadCount = unreadSnap.size || 1;
          } catch { /* ignore */ }
        }

        // Skip digest if no actual unread messages
        if (isDigest && unreadCount === 0) {
          console.log(`[MESSAGE_EMAIL] Digest suppressed: no unread messages for "${supporterName}"`);
          return NextResponse.json({ success: true, suppressed: true, reason: "no_unread" });
        }

        // Update lastNotifiedAt
        await adminDb.collection("chatrooms").doc(chatroomId).update({
          lastNotifiedAt: new Date(),
        });
      }
    } catch (err) {
      console.error("[MESSAGE_EMAIL] Failed to check/update chatroom:", err);
    }

    if (!shouldSend) {
      return NextResponse.json({ success: true, suppressed: true });
    }

    const subject = isDigest
      ? `Reminder: ${unreadCount} unread message${unreadCount > 1 ? "s" : ""} from ${supporterName}`
      : `New message from ${supporterName} on Agaseke`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ea580c; margin: 0;">agaseke.me</h1>
        </div>
        
        <div style="background: #fff7ed; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">
            ${isDigest ? `Messages Waiting for You` : `New Message Received`}
          </h2>
          
          ${isDigest ? `
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              You have <strong style="color: #1f2937;">${unreadCount} unread message${unreadCount > 1 ? "s" : ""}</strong> from <strong style="color: #1f2937;">${supporterName}</strong> waiting for your response.
            </p>
          ` : `
            <p style="color: #4b5563; margin: 0 0 16px 0;">
              <strong style="color: #1f2937;">${supporterName}</strong> sent you a message on Agaseke:
            </p>
            <div style="background: white; border-radius: 8px; padding: 16px; border-left: 4px solid #ea580c; margin-bottom: 20px;">
              <p style="color: #1f2937; margin: 0; font-style: italic; line-height: 1.6;">
                &quot;${message.length > 200 ? message.substring(0, 200) + "..." : message}&quot;
              </p>
            </div>
          `}
          
          <a href="${chatroomUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isDigest ? "View Messages" : "Reply to Message"}
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          You received this email because someone sent you a message on Agaseke.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Agaseke" <${process.env.EMAIL_USER}>`,
      to: creatorEmail,
      subject,
      html: emailHtml,
    });

    console.log(`[MESSAGE_EMAIL] ${isDigest ? "Digest" : "Email"} sent to "${creatorEmail}" for "${supporterName}", messageId=${info.messageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MESSAGE_EMAIL] Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
