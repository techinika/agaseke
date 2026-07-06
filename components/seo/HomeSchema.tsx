import { getOrganizationSchemaJsonLd, getWebsiteSchema, getFAQSchema } from "@/lib/schemas";

export default function HomeSchema() {
  const organization = getOrganizationSchemaJsonLd();
  const website = getWebsiteSchema();
  const faq = getFAQSchema([
    {
      question: "What is Agaseke?",
      answer:
        "Agaseke is a private community platform for content creators and influencers across Africa. Your biggest fans can support you directly through one-time tips, monthly subscriptions, and purchases of your exclusive content — all paid out to your Mobile Money or Bank account.",
    },
    {
      question: "How is this different from social media?",
      answer:
        "On social media platforms, your content competes with an algorithm for visibility. Agaseke gives you a private community space where only your paying supporters have access — no ads, no algorithm, just a direct connection with the people who value your work.",
    },
    {
      question: "How do creators receive their earnings?",
      answer:
        "Creators can withdraw their earnings directly to their Mobile Money account or Bank account. Withdrawals are processed within 1-2 business days after approval.",
    },
    {
      question: "Is Agaseke available in my country?",
      answer:
        "Yes! Agaseke is built for creators across Africa and beyond. We support multiple currencies and payment methods so creators from different countries can join, connect with their fans, and earn on their own terms.",
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
