import { notFound } from "next/navigation";
import { CreatorPagePreview } from "./Preview";

export const metadata = {
  title: "Creator page preview",
  robots: { index: false, follow: false },
};

export default function DevCreatorPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_CREATOR_PAGE === "1";

  if (!enabled) notFound();

  return <CreatorPagePreview />;
}
