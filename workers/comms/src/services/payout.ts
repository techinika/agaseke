import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const payoutProcessed: EmailService = {
  purpose: "payout_processed",
  async resolveRecipients(data) {
    return { to: data.creatorEmail as string };
  },
  buildSubject() {
    return "Your Payout Has Been Processed! - Agaseke";
  },
  async buildTemplateData(data) {
    const amountLabel = data.currency
      ? `${String(data.amount ?? "")} ${String(data.currency)}`
      : String(data.amount ?? "");
    return {
      headerColor: "#059669",
      headerTitle: "Payout Processed",
      title: `Your payout of ${amountLabel} has been processed!`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;font-weight:600;font-size:18px;">${amountLabel}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Method</td><td style="padding:6px 0;">${data.method as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Account</td><td style="padding:6px 0;">${data.accountNumber as string}</td></tr>
             </table>
             <p>Please allow 1-3 business days for the funds to reflect in your account.</p>`,
      ctaText: "View Payouts",
      ctaUrl: `${data.appUrl}/creator/payouts`,
    };
  },
};
