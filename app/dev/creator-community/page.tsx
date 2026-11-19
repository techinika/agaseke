import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorCommunityPreview, type CreatorCommunitySurface } from "./Preview";

export const metadata: Metadata = {
  title: "Creator community preview",
  robots: { index: false, follow: false },
};

const SURFACES = new Set(["community", "chat", "messages", "notices"]);

type SearchParams = Promise<{ surface?: string; dialog?: string }>;

export default async function DevCreatorCommunityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_DEV_CREATOR_COMMUNITY !== "1"
  ) {
    notFound();
  }

  const params = await searchParams;
  const surface = (
    SURFACES.has(params.surface ?? "") ? params.surface : "community"
  ) as CreatorCommunitySurface;

  return <CreatorCommunityPreview surface={surface} dialog={params.dialog} />;
}
