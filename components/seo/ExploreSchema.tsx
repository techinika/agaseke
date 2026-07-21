import { getBreadcrumbSchema, getOrganizationSchema } from "@/lib/schemas";
import { baseUrl } from "@/lib/baseUrl";

export default function ExploreSchema() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Explore Creators", url: "/explore" },
  ]);

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore African Creators | Agaseke",
    description:
      "Discover and support talented creators in Africa. Browse artists, musicians, content creators, and more.",
    url: `${baseUrl}/explore`,
    breadcrumb: breadcrumbs,
    about: {
      "@type": "Thing",
      name: "African Creators Directory",
      description: "A curated directory of African content creators, artists, musicians, and storytellers.",
    },
    publisher: getOrganizationSchema(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />
    </>
  );
}
