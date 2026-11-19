import { notFound } from "next/navigation";
import { AuthVerifyPreview } from "./Preview";

export const metadata = {
  title: "Verification preview",
  robots: { index: false, follow: false },
};

export default function DevAuthVerifyPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_AUTH === "1";

  if (!enabled) notFound();

  return <AuthVerifyPreview />;
}
