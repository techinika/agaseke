import { getBreadcrumbSchema } from "@/lib/schemas";

export default function ExplorePostsSchema() {
  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Explore Posts", url: "/explore/posts" },
  ]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
    />
  );
}
