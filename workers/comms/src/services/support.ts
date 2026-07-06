import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const supportReceived: EmailService = {
  purpose: "support_received",
  async resolveRecipients(data) {
    return { to: data.creatorEmail as string };
  },
  buildSubject(data) {
    return `You just received ${data.amount as string} on Agaseke!`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#059669",
      headerTitle: "Support Received",
      title: `You received ${data.amount as string} from ${data.supporterName as string}!`,
      body: `<p style="font-size:24px;font-weight:700;text-align:center;color:#059669;padding:16px 0;">
               ${data.amount as string}
             </p>
             <p><strong>From:</strong> ${data.supporterName as string}</p>
             ${data.message ? `<div style="background:#f8f9fa;padding:12px 16px;border-radius:4px;margin:8px 0;"><p style="margin:0;font-style:italic;">"${data.message as string}"</p></div>` : ""}`,
      ctaText: "View Supporters",
      ctaUrl: `${data.appUrl}/creator/supporters`,
    };
  },
};
