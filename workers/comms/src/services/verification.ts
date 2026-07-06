import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const verificationRequest: EmailService = {
  purpose: "verification_request",
  async resolveRecipients(data) {
    return { to: data.adminEmail as string };
  },
  buildSubject(data) {
    return `New KYC Verification Request: ${data.accountName as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#f59e0b",
      headerTitle: "Verification Request",
      title: `New verification request from ${data.accountName as string}`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Name</td><td style="padding:6px 0;font-weight:600;">${data.accountName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Bank</td><td style="padding:6px 0;">${data.bankName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Account</td><td style="padding:6px 0;">${data.accountNumber as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Country</td><td style="padding:6px 0;">${data.country as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Payout Preference</td><td style="padding:6px 0;text-transform:capitalize;">${data.payoutPreference as string}</td></tr>
               ${data.swiftCode ? `<tr><td style="padding:6px 0;color:#888;">SWIFT</td><td style="padding:6px 0;">${data.swiftCode as string}</td></tr>` : ""}
             </table>`,
      ctaText: "Review in Admin",
      ctaUrl: `${data.appUrl}/admin/users`,
    };
  },
};

export const verificationFeedback: EmailService = {
  purpose: "verification_feedback",
  async resolveRecipients(data) {
    return { to: data.email as string };
  },
  buildSubject(data) {
    return data.approved
      ? "Agaseke Verification Successful"
      : "Action Required: Agaseke Verification Update";
  },
  async buildTemplateData(data) {
    const approved = data.approved as boolean;
    return {
      headerColor: approved ? "#059669" : "#dc2626",
      headerTitle: approved ? "Verified" : "Verification Update",
      title: approved
        ? "Your verification was successful!"
        : "Your verification needs attention",
      body: approved
        ? `<p>Congratulations! Your identity has been verified. You can now receive payouts on Agaseke.</p>`
        : `<p>Unfortunately, your verification was not approved.</p>
           ${data.reason ? `<p><strong>Reason:</strong><br>${data.reason as string}</p>` : ""}
           <p>Please submit a new verification request with corrected information.</p>`,
      ctaText: approved ? "Go to Dashboard" : "Re-submit Verification",
      ctaUrl: approved ? `${data.appUrl}/creator` : `${data.appUrl}/creator/verify`,
    };
  },
};
