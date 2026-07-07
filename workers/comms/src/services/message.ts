import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const messageNew: EmailService = {
  purpose: "message_new",
  async resolveRecipients(data) {
    return { to: data.creatorEmail as string };
  },
  buildSubject(data) {
    return `New message from ${data.supporterName as string} on Agaseke`;
  },
  async buildTemplateData(data) {
    const preview = (data.message as string)?.slice(0, 200);
    return {
      headerColor: "#2563eb",
      headerTitle: "New Message",
      title: `${data.supporterName as string} sent you a message`,
      body: `<div style="background:#f8f9fa;border-left:3px solid #2563eb;padding:12px 16px;margin:8px 0;border-radius:4px;">
               <p style="margin:0;color:#555;font-style:italic;">"${preview}${(data.message as string)?.length > 200 ? "..." : ""}"</p>
             </div>`,
      ctaText: "Reply to Message",
      ctaUrl: `${data.appUrl}/creator/messages`,
    };
  },
};

export const messageDigest: EmailService = {
  purpose: "message_digest",
  async resolveRecipients(data) {
    return { to: data.creatorEmail as string };
  },
  buildSubject(data) {
    return `Reminder: ${data.unreadCount as string} unread message(s) from ${data.supporterName as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#8b5cf6",
      headerTitle: "Message Digest",
      title: `You have ${data.unreadCount as string} unread message(s) from ${data.supporterName as string}`,
      body: `<p>You haven't read their latest message yet. Head to your inbox to reply.</p>`,
      ctaText: "View Messages",
      ctaUrl: `${data.appUrl}/creator/messages`,
    };
  },
};
