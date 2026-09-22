import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const subscriptionRenewalReminder: EmailService = {
  purpose: "subscription_renewal_reminder",
  async resolveRecipients(data) {
    return { to: data.userEmail as string };
  },
  buildSubject(data) {
    const tierName = (data.tierName as string) || "community";
    if (data.status === "expired") {
      return `Your ${tierName} subscription has ended — renew to keep your benefits`;
    }
    return `Your ${tierName} subscription is due for renewal`;
  },
  async buildTemplateData(data) {
    const tierName = (data.tierName as string) || "Community";
    const amount = data.amount as string;
    const currency = (data.currency as string) || "RWF";
    const interval = (data.interval as string) === "yearly" ? "year" : "month";
    const expiresAt = (data.expiresAt as string) || "soon";
    const creatorName = (data.creatorHandle as string) || "the creator";
    const autoRenew = !!data.autoRenew;
    const renewalUrl = `${data.appUrl}/community/manage/${data.subscriptionId as string}`;

    const body =
      data.status === "expired"
        ? `<p>Your <strong>${tierName}</strong> membership with ${creatorName} has ended.</p>
           <p>You've lost access to member-only benefits and the community. Renew your <strong>${amount} ${currency}</strong>/${interval} plan to pick up right where you left off.</p>`
        : `<p>Your <strong>${tierName}</strong> membership with ${creatorName} is due for renewal.</p>
           <p>Plan: <strong>${amount} ${currency}</strong>/${interval}<br />
           Renewal date: ${expiresAt}</p>
           <p>${autoRenew ? "Your Mobile Money renewal is set up to be charged automatically. If you'd rather pay by card or update your payment details, open the renewal page below." : "Renew on the renewal page to keep your benefits and community access without a gap."}</p>`;

    return {
      headerColor: "#ea580c",
      headerTitle: "Subscription Renewal",
      title:
        data.status === "expired"
          ? `Your ${tierName} subscription has ended`
          : `Time to renew your ${tierName} subscription`,
      body,
      ctaText: "Renew Subscription",
      ctaUrl: renewalUrl,
      footerNote: "You can manage or cancel your subscription anytime from the renewal page.",
    };
  },
};