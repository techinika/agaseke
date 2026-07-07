import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const welcomeCreator: EmailService = {
  purpose: "welcome_creator",
  async resolveRecipients(data) {
    return { to: data.email as string };
  },
  buildSubject() {
    return "Welcome to Agaseke - Start Earning from Your Work!";
  },
  async buildTemplateData(data) {
    const name = data.name as string;
    return {
      headerColor: "#ea580c",
      headerTitle: "Welcome to Agaseke",
      title: `Hey ${name}, welcome to Agaseke!`,
      body: `<p>I'm Songa, founder of Agaseke. I personally wanted to welcome you to the platform.</p>
             <p>Agaseke is built for African creators like you. Here's how to get started:</p>
             <ul>
               <li><strong>Set up your profile</strong> — Add your bio, photo, and social links</li>
               <li><strong>Create content</strong> — Share posts, videos, and documents with your fans</li>
               <li><strong>Set up your store</strong> — Sell digital and physical products</li>
               <li><strong>Receive support</strong> — Your fans can send you money via Mobile Money or Card</li>
             </ul>
             <p>If you have any questions, just reply to this email. I read every message.</p>
             <p>Let's build something great together!</p>
             <p>— Songa</p>`,
      ctaText: "Go to Your Dashboard",
      ctaUrl: `${data.appUrl}/creator`,
    };
  },
};

export const profileLive: EmailService = {
  purpose: "profile_live",
  async resolveRecipients(data) {
    return { to: data.email as string };
  },
  buildSubject() {
    return "Your creator profile is now live!";
  },
  async buildTemplateData(data) {
    const name = data.name as string;
    const handle = data.handle as string;
    return {
      headerColor: "#059669",
      headerTitle: "Profile Live",
      title: `Great news, ${name}!`,
      body: `<p>Your creator profile is now live and visible to the world.</p>
             <p>Share your profile link with your fans and start building your community:</p>
             <p style="text-align:center;font-size:18px;font-weight:600;">
               ${data.appUrl}/${handle}
             </p>
             <p>Join our creator community on WhatsApp to connect with other creators, share tips, and get updates:</p>`,
      ctaText: "Join Creator WhatsApp Group",
      ctaUrl: "https://chat.whatsapp.com/agaseke-creators",
      footerNote: "We're excited to have you on this journey!",
    };
  },
};
