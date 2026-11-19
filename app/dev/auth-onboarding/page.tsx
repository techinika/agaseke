import { notFound } from "next/navigation";
import { AuthOnboardingPreview } from "./Preview";

export const metadata = {
  title: "Onboarding preview",
  robots: { index: false, follow: false },
};

export default function DevAuthOnboardingPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_AUTH === "1";

  if (!enabled) notFound();

  return <AuthOnboardingPreview />;
}
