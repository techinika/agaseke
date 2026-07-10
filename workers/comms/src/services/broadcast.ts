import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const broadcast: EmailService = {
  purpose: "broadcast",
  async resolveRecipients(data) {
    const recipients = data.recipients as Array<{ email: string; name?: string; handle?: string }>;
    const emails = recipients.map((r: { email: string }) => r.email);
    const recipientMeta: Record<string, { name?: string; handle?: string }> = {};
    for (const r of recipients) {
      if (r.email) {
        recipientMeta[r.email] = { name: r.name, handle: r.handle };
      }
    }
    return { to: emails, recipientMeta };
  },
  buildSubject(data) {
    return data.subject as string;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#ea580c",
      headerTitle: "Agaseke Update",
      title: data.subject as string,
      body: `<div style="white-space:pre-wrap;">${data.message as string}</div>`,
      footerNote: `You received this because you're part of the Agaseke community.`,
    };
  },
};
