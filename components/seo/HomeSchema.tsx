"use client";

import { useEffect } from "react";
import { getOrganizationSchemaJsonLd, getWebsiteSchema, getFAQSchema } from "@/lib/schemas";

export default function HomeSchema() {
  useEffect(() => {
    const organization = getOrganizationSchemaJsonLd();
    const website = getWebsiteSchema();
    const faq = getFAQSchema([
      {
        question: "What is Agaseke?",
        answer:
          "Agaseke is a platform that allows fans to support their favorite Rwandan creators through donations, purchases, and exclusive content. It helps creators monetize their work and build a sustainable community.",
      },
      {
        question: "How can I support a creator?",
        answer:
          "You can support creators by making one-time payments via Mobile Money (MTN or Airtel Money), purchasing their digital or physical products, or tipping them directly through the platform.",
      },
      {
        question: "How do creators receive their earnings?",
        answer:
          "Creators can withdraw their earnings directly to their Mobile Money account (MTN or Airtel Money). Withdrawals are processed within 1-2 business days after approval.",
      },
      {
        question: "Is Agaseke only for Rwandan creators?",
        answer:
          "While Agaseke was built specifically to support Rwandan creators, it's open to creators from anywhere. The platform supports Mobile Money payments which are popular in Rwanda.",
      },
    ]);

    const schemas = [organization, website, faq];
    schemas.forEach((schema, index) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `home-schema-${index}`;
      script.innerHTML = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      schemas.forEach((_, index) => {
        const existing = document.getElementById(`home-schema-${index}`);
        if (existing) existing.remove();
      });
    };
  }, []);

  return null;
}
