import type { EmailService, EmailAddresses, EmailTemplateData, Env } from "../types";
import { fetchCreatorEmail, fetchSupporters } from "./helpers";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePath(path: unknown, fallbackHandle?: unknown): string {
  if (typeof path === "string" && path.startsWith("/")) return path;
  if (typeof fallbackHandle === "string" && fallbackHandle) {
    return `/${fallbackHandle}/community`;
  }
  return "/creator/content";
}

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
      ctaText: "Open Community Page",
      ctaUrl: `${data.appUrl}/${data.creatorHandle as string}/community`,
    };
  },
};

export const contentComment: EmailService = {
  purpose: "content_comment",
  async resolveRecipients(data) {
    const email = await fetchCreatorEmail(
      (data.creatorUid as string) || "",
      data.env as Env,
      (data.creatorHandle as string) || undefined,
    );
    if (!email) return { to: [] };
    return {
      to: email,
      recipientMeta: {
        [email]: {
          name: (data.creatorName as string) || undefined,
          handle: (data.creatorHandle as string) || undefined,
        },
      },
    };
  },
  buildSubject(data) {
    const commenter = String(data.commenterName || "Someone");
    const kind = data.contentKind === "article" ? "article" : "post";
    const title = typeof data.contentTitle === "string" ? data.contentTitle.trim() : "";
    return title
      ? `${commenter} commented on "${title}"`
      : `${commenter} commented on your ${kind} on Agaseke`;
  },
  async buildTemplateData(data) {
    const commenter = escapeHtml(String(data.commenterName || "Someone"));
    const kind = data.contentKind === "article" ? "article" : "post";
    const rawTitle = typeof data.contentTitle === "string" ? data.contentTitle.trim() : "";
    const safeTitle = rawTitle ? escapeHtml(rawTitle) : `your ${kind}`;
    const rawComment = typeof data.commentText === "string" ? data.commentText.trim() : "";
    const excerpt = rawComment.slice(0, 300);
    const safeExcerpt = escapeHtml(excerpt);
    const actionVerb = data.isReply ? "replied to a comment on" : "commented on";
    const ctaPath = normalizePath(data.contentPath, data.creatorHandle);

    return {
      headerColor: "#C40000",
      headerTitle: "New Comment",
      title: `${commenter} ${actionVerb} ${rawTitle ? `"${safeTitle}"` : `your ${kind}`}`,
      body: `${
        safeExcerpt
          ? `<div style="background:#f8f9fa;border-left:3px solid #C40000;padding:12px 16px;margin:12px 0;border-radius:4px;">
               <p style="margin:0;color:#333;font-style:italic;">"${safeExcerpt}${rawComment.length > 300 ? "..." : ""}"</p>
             </div>`
          : `<p>${commenter} left a new comment on your ${kind} on Agaseke.</p>`
      }
      <p style="color:#666;">Head back to your ${kind} to read and reply to the conversation.</p>`,
      ctaText: data.contentKind === "article" ? "View Article" : "View Post",
      ctaUrl: `${data.appUrl}${ctaPath}`,
    };
  },
};

export const contentLikesMilestone: EmailService = {
  purpose: "content_likes_milestone",
  async resolveRecipients(data) {
    const email = await fetchCreatorEmail(
      (data.creatorUid as string) || "",
      data.env as Env,
      (data.creatorHandle as string) || undefined,
    );
    if (!email) return { to: [] };
    return {
      to: email,
      recipientMeta: {
        [email]: {
          name: (data.creatorName as string) || undefined,
          handle: (data.creatorHandle as string) || undefined,
        },
      },
    };
  },
  buildSubject(data) {
    const milestone = Number(data.milestone || 10);
    const kind = data.contentKind === "article" ? "article" : "post";
    const title = typeof data.contentTitle === "string" ? data.contentTitle.trim() : "";
    return title
      ? `Your ${kind} "${title}" reached ${milestone} likes on Agaseke!`
      : `Your ${kind} reached ${milestone} likes on Agaseke!`;
  },
  async buildTemplateData(data) {
    const milestone = Number(data.milestone || 10);
    const kind = data.contentKind === "article" ? "article" : "post";
    const rawTitle = typeof data.contentTitle === "string" ? data.contentTitle.trim() : "";
    const safeTitle = rawTitle ? `"${escapeHtml(rawTitle)}"` : `your ${kind}`;
    const ctaPath = normalizePath(data.contentPath, data.creatorHandle);

    return {
      headerColor: "#C40000",
      headerTitle: `${milestone} Likes Reached`,
      title: `Your ${kind} just hit ${milestone} likes!`,
      body: `<p>Great news — ${rawTitle ? `your ${kind} <strong>${safeTitle}</strong>` : `your ${kind}`} has reached <strong>${milestone} likes</strong> on Agaseke.</p>
             <p style="color:#666;">Keep engaging with your supporters or share a quick update with your community.</p>`,
      ctaText: data.contentKind === "article" ? "Open Article" : "Open Post",
      ctaUrl: `${data.appUrl}${ctaPath}`,
    };
  },
};
