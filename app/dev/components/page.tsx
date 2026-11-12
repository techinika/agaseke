import { notFound } from "next/navigation";
import { ComponentGallery } from "./ComponentGallery";

export const metadata = {
  title: "UI components",
  robots: { index: false, follow: false },
};

export default function DevComponentsPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEV_COMPONENTS === "1";

  if (!enabled) notFound();

  return <ComponentGallery />;
}
