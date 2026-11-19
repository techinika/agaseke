import { notFound } from "next/navigation";
import { CreatorCorePreview, type CreatorCoreSurface } from "./Preview";

export const metadata = {
  title: "Creator dashboard core preview",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ surface?: string; dialog?: string }>;

const SURFACES = new Set(["home", "payouts", "settings", "sales", "supporters"]);

export default async function DevCreatorCorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_CREATOR_CORE === "1";

  if (!enabled) notFound();

  const params = await searchParams;
  const surface = (
    SURFACES.has(params.surface ?? "") ? params.surface : "home"
  ) as CreatorCoreSurface;

  return <CreatorCorePreview surface={surface} dialog={params.dialog} />;
}
