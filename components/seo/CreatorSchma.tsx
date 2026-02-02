import { baseUrl } from "@/app/sitemap";
import { Creator } from "@/types/creator";

export default function CreatorSchema({
  creator,
  handle,
}: {
  creator: Creator;
  handle: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: creator.name,
    url: `${baseUrl}/${handle}`,
    jobTitle: "Creator",
    description: creator.bio,
    identifier: handle,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/${handle}`,
    },
    sameAs: [
      creator.socials.twitter
        ? `https://twitter.com/${creator.socials.twitter}`
        : null,
      creator.socials.instagram
        ? `https://instagram.com/${creator.socials.instagram}`
        : null,
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
