import { baseUrl } from "@/lib/baseUrl";

interface OrganizationSchema {
  name: string;
  description: string;
  url: string;
  logo: string;
  sameAs: string[];
}

export function getOrganizationSchema(): OrganizationSchema {
  return {
    name: "Agaseke",
    description:
      "The premier platform for Rwandan creators to monetize their content and grow their community through support from fans.",
    url: baseUrl,
    logo: `${baseUrl}/agaseke.png`,
    sameAs: [
      "https://x.com/Agaseke_support",
      "https://www.instagram.com/agaseke_support",
      "https://www.facebook.com/agaseke",
    ],
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Agaseke",
    url: baseUrl,
    description: "Support Rwandan creators through donations and subscriptions.",
    publisher: getOrganizationSchema(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getOrganizationSchemaJsonLd() {
  const org = getOrganizationSchema();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    description: org.description,
    url: org.url,
    logo: org.logo,
    sameAs: org.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Kinyarwanda"],
    },
  };
}

export function getBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

export function getCreatorProfileSchema(
  handle: string,
  name: string,
  bio: string | null,
  image: string | null,
  verified: boolean,
  socials: {
    twitter?: string | null;
    instagram?: string | null;
    youtube?: string | null;
  }
) {
  const sameAs: string[] = [];
  if (socials.twitter) sameAs.push(`https://x.com/${socials.twitter}`);
  if (socials.instagram)
    sameAs.push(`https://instagram.com/${socials.instagram}`);
  if (socials.youtube) sameAs.push(socials.youtube);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    alternateName: handle,
    description: bio,
    image: image || undefined,
    url: `${baseUrl}/${handle}`,
    ...(sameAs.length > 0 && { sameAs }),
    ...(verified && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "100",
      },
    }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/${handle}`,
    },
  };
}

export function getProductSchema(
  name: string,
  description: string,
  price: number,
  currency: string,
  image: string,
  creatorName: string,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    offers: {
      "@type": "Offer",
      price: price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Person",
        name: creatorName,
      },
    },
    url: `${baseUrl}${url}`,
  };
}

export function getGiveawaySchema(
  title: string,
  description: string,
  organizerName: string,
  organizerUrl: string,
  startDate: Date,
  endDate: Date,
  prizeValue?: number
) {
  return {
    "@context": "https://schema.org",
    "@type": "Giveaway",
    name: title,
    description,
    organizer: {
      "@type": "Person",
      name: organizerName,
      url: organizerUrl,
    },
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    ...(prizeValue && {
      prize: {
        "@type": "MonetaryAmount",
        value: prizeValue,
        currency: "RWF",
      },
    }),
  };
}

export function getFAQSchema(questions: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}
