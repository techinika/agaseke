import { baseUrl } from "@/app/sitemap";

export default function ExploreSchema({ creators }: { creators: any[] }) {

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: creators.map((creator, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/${creator.handle}`,
      name: creator.name,
      description: creator.bio,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
