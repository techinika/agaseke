import type { Env, EmailPurpose } from "./types";
import { firestorePost } from "./firestore";

export interface EmailLog {
  purpose: EmailPurpose;
  recipientCount: number;
  recipients: string;
  subject: string;
  uid: string;
  userEmail?: string | null;
  messageId?: string;
  error?: string;
}

export async function logEmailSend(
  env: Env,
  log: EmailLog
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      level: { stringValue: log.error ? "error" : "info" },
      category: { stringValue: "email" },
      message: {
        stringValue: log.error
          ? `Email failed: ${log.purpose} — ${log.error}`
          : `Email sent: ${log.purpose} to ${log.recipientCount} recipient(s)`,
      },
      purpose: { stringValue: log.purpose },
      recipientCount: { integerValue: String(log.recipientCount) },
      recipients: { stringValue: log.recipients.slice(0, 2000) },
      subject: { stringValue: log.subject.slice(0, 500) },
      uid: { stringValue: log.uid },
      createdAt: { timestampValue: now },
    };

    if (log.userEmail) fields.userEmail = { stringValue: log.userEmail };
    if (log.messageId) fields.messageId = { stringValue: log.messageId };
    if (log.error) {
      fields.error = { stringValue: log.error.slice(0, 2000) };
    }

    await firestorePost(env, "activityLogs", { fields });
  } catch (err) {
    console.error("Email log error:", err);
  }
}
