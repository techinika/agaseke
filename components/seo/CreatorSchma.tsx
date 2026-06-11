import { baseUrl } from "@/lib/baseUrl";

export default function CreatorSchema({
  creator,
  handle,
}: {
  creator: any;
  handle: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: creator.name || handle,
    alternateName: handle,
    url: `${baseUrl}/${handle}`,
    image: creator.profilePicture || `${baseUrl}/agaseke.png`,
    jobTitle: "Creator",
    description: creator.bio || `Content creator on Agaseke`,
    identifier: handle,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/${handle}`,
    },
    sameAs: [
      creator.socials?.twitter
        ? `https://x.com/${creator.socials.twitter}`
        : null,
      creator.socials?.instagram
        ? `https://instagram.com/${creator.socials.instagram}`
        : null,
    ].filter(Boolean),
  };

  if (creator.views) {
    schema.interactionStatistic = {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: creator.views,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
