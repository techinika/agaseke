import type { EmailService } from "../types";

export const withdrawalRequest: EmailService = {
  purpose: "withdrawal_request",
  async resolveRecipients(data) {
    return { to: data.adminEmail as string };
  },
  buildSubject(data) {
    return `New Withdrawal Request: ${data.creatorName as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#f59e0b",
      headerTitle: "Withdrawal Request",
      title: `New withdrawal request from ${data.creatorName as string}`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Creator</td><td style="padding:6px 0;font-weight:600;">${data.creatorName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${data.creatorEmail as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;">${data.amount as number} ${data.currency as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Method</td><td style="padding:6px 0;">${data.method as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Account</td><td style="padding:6px 0;">${data.accountNumber as string}</td></tr>
             </table>`,
      ctaText: "Review in Admin",
      ctaUrl: `${data.appUrl}/admin`,
    };
  },
};
