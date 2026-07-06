import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const broadcast: EmailService = {
  purpose: "broadcast",
  async resolveRecipients(data) {
    const recipients = data.recipients as Array<{ email: string }>;
    const emails = recipients.map((r: { email: string }) => r.email);
    return { to: emails };
  },
  buildSubject(data) {
    return data.subject as string;
  },
  async buildTemplateData(data) {
    let message = data.message as string;
    const recipients = data.recipients as Array<{ name: string; handle: string }> | undefined;

    if (recipients?.length === 1) {
      const r = recipients[0];
      message = message
        .replace(/\[NAME\]/g, r.name || "there")
        .replace(/\[HANDLE\]/g, r.handle || "");
    }

    return {
      headerColor: "#ea580c",
      headerTitle: "Agaseke Update",
      title: data.subject as string,
      body: `<div style="white-space:pre-wrap;">${message}</div>`,
      footerNote: `You received this because you're part of the Agaseke community.`,
    };
  },
};
