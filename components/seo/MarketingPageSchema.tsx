import { baseUrl } from "@/lib/baseUrl";
import {
  getOrganizationSchema,
  getBreadcrumbSchema,
  getFAQSchema,
} from "@/lib/schemas";

interface FAQ {
  question: string;
  answer: string;
}

interface MarketingPageSchemaProps {
  pageUrl: string;
  pageName: string;
  pageDescription: string;
  faqs: FAQ[];
}

export default function MarketingPageSchema({
  pageUrl,
  pageName,
  pageDescription,
  faqs,
}: MarketingPageSchemaProps) {
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${baseUrl}${pageUrl}`,
    name: pageName,
    description: pageDescription,
    url: `${baseUrl}${pageUrl}`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Agaseke",
      url: baseUrl,
    },
    about: getOrganizationSchema(),
    publisher: getOrganizationSchema(),
  };

  const breadcrumb = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: pageName, url: pageUrl },
  ]);

  const faq = getFAQSchema(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}