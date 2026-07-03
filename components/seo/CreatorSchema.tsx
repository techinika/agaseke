import { getCreatorProfileSchema, getBreadcrumbSchema } from "@/lib/schemas";
import { Creator } from "@/types/creator";

interface CreatorSchemaProps {
  creator: Creator;
  handle: string;
}

export default function CreatorSchema({ creator, handle }: CreatorSchemaProps) {
  const profile = getCreatorProfileSchema(
    handle,
    creator.name,
    creator.bio || null,
    creator.profilePicture || null,
    creator.verified || false,
    {
      twitter: creator.socials?.twitter || null,
      instagram: creator.socials?.instagram || null,
      youtube: creator.socials?.youtube || null,
    }
  );

  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Explore", url: "/explore" },
    { name: creator.name, url: `/${handle}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profile) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
