import { notFound } from "next/navigation";
import { ActionsPreview } from "./Preview";

export const metadata = {
  title: "Supporter actions preview",
  robots: { index: false, follow: false },
};

export default function DevActionsPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_ACTIONS === "1";

  if (!enabled) notFound();

  return <ActionsPreview />;
}
