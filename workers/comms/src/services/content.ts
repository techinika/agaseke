import type { EmailService, EmailAddresses, EmailTemplateData, Env } from "../types";
import { fetchSupporters } from "./helpers";

export const contentNew: EmailService = {
  purpose: "content_new",
  async resolveRecipients(data) {
    const { emails, names } = await fetchSupporters(data.creatorId as string, data.env as Env);
    return {
      to: emails,
      recipientMeta: Object.fromEntries(emails.map((e) => [e, { name: names[e] }])),
    };
  },
  buildSubject(data) {
    return `New content from ${data.creatorName as string} on Agaseke!`;
  },
  async buildTemplateData(data) {
    const isPrivate = data.contentType === "private";
    const preview = (data.contentDescription as string)?.slice(0, 300);

    return {
      headerColor: isPrivate ? "#8b5cf6" : "#ea580c",
      headerTitle: isPrivate ? "Exclusive Content" : "New Content",
      title: `${data.creatorName as string} just posted ${isPrivate ? "exclusive" : "new"} content!`,
      body: `<p>${preview}${(data.contentDescription as string)?.length > 300 ? "..." : ""}</p>
             ${isPrivate ? `<p style="color:#8b5cf6;font-weight:600;">🔒 This is supporters-only content</p>` : ""}`,
      ctaText: "View Content",
      ctaUrl: `${data.appUrl}/${data.creatorHandle as string}/community/${data.contentId as string}`,
    };
  },
};
