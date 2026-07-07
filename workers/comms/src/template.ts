import type { EmailTemplateData } from "./types";

export function renderEmailHtml(data: EmailTemplateData, appUrl: string, assetsUrl: string): string {
  const {
    headerColor = "#ea580c",
    headerTitle = "Agaseke",
    title,
    body,
    ctaText,
    ctaUrl,
    footerNote,
    extraContent = "",
  } = data;

  const ctaBlock = ctaText && ctaUrl
    ? `<tr>
        <td align="center" style="padding: 0 24px 32px;">
          <a href="${ctaUrl}"
             style="display: inline-block; padding: 14px 36px; background: #ea580c; color: #ffffff;
                    text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            ${ctaText}
          </a>
        </td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: ${headerColor}; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                ${headerTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px 8px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                ${title}
              </h2>
              <div style="color: #555; font-size: 15px; line-height: 1.6;">
                ${body}
              </div>
            </td>
          </tr>
          ${ctaBlock}
          ${extraContent ? `<tr><td style="padding: 0 24px 24px;">${extraContent}</td></tr>` : ""}
          <tr>
            <td style="padding: 24px; border-top: 1px solid #eee; text-align: center;">
              <p style="margin: 0 0 8px; color: #888; font-size: 12px; line-height: 1.5;">
                ${footerNote || "Sent via Agaseke"}
              </p>
              <p style="margin: 0; color: #aaa; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Agaseke. All rights reserved.
              </p>
              <p style="margin: 4px 0 0; color: #aaa; font-size: 11px;">
                ${appUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(body: string, appUrl: string): string {
  const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  return `${stripHtml(body)}\n\n---\n${appUrl}`;
}
