"use client";

import { useEffect } from "react";
import { getCreatorProfileSchema, getBreadcrumbSchema } from "@/lib/schemas";
import { Creator } from "@/types/creator";

interface CreatorSchemaProps {
  creator: Creator;
  handle: string;
}

export default function CreatorSchema({ creator, handle }: CreatorSchemaProps) {
  useEffect(() => {
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

    const schemas = [profile, breadcrumbs];
    schemas.forEach((schema, index) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `creator-schema-${index}`;
      script.innerHTML = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      schemas.forEach((_, index) => {
        const existing = document.getElementById(`creator-schema-${index}`);
        if (existing) existing.remove();
      });
    };
  }, [creator, handle]);

  return null;
}
