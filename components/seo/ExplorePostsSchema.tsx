import { getBreadcrumbSchema, getOrganizationSchema } from "@/lib/schemas";
import { baseUrl } from "@/lib/baseUrl";

export default function ExplorePostsSchema() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Explore Posts", url: "/explore/posts" },
  ]);

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Discover Public Posts from African Creators | Agaseke",
    description:
      "Browse public posts from creators across Africa. Read stories, watch videos, view images, and discover the talent shaping the continent.",
    url: `${baseUrl}/explore/posts`,
    breadcrumb: breadcrumbs,
    about: {
      "@type": "Thing",
      name: "Creator Content",
      description: "Public posts, stories, videos, and content published by African creators on Agaseke.",
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
