export default function HomeSchema() {
  const baseUrl = "https://yourdomain.rw";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agaseke",
    url: baseUrl,
    logo: `${baseUrl}/agaseke.png`,
    sameAs: [
      "https://x.com/agaseke_support",
      "https://instagram.com/agaseke_support",
    ],
    description:
      "A platform dedicated to supporting and fueling Rwandan creativity.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
