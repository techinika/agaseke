import PayoutPolicy from "@/components/pages/Legal/PayoutPolicyPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payout Policy | Agaseke for Creators",
  description:
    "Learn how and when creators receive their funds on Agaseke for Creators.",
  openGraph: {
    title: "Payout Policy | Agaseke for Creators",
    description:
      "Learn how and when creators receive their funds on Agaseke for Creators.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/payout-policy",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Payout Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Payout Policy | Agaseke for Creators",
    description:
      "Learn how and when creators receive their funds on Agaseke for Creators.",
    images: ["/agaseke.png"],
  },
};

export default function page() {
  return <PayoutPolicy />;
}
