import LandingPage from "@/components/pages/LandingPage";
import HomeSchema from "@/components/seo/HomeSchema";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agaseke | Build Your Private Creator Community",
  description:
    "A private community platform for content creators and influencers. Your biggest fans support you directly through tips, subscriptions, and exclusive content — paid out to your Mobile Money or Bank account.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Agaseke",
    title: "Agaseke | Build Your Private Creator Community",
    description:
      "A private community platform for content creators. Your fans support you directly through tips, subscriptions, and purchases — no algorithm, no ads.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke - Build Your Private Creator Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | Build Your Private Creator Community",
    description:
      "A private community platform for content creators across Africa. Your fans support you directly through tips, subscriptions, and exclusive content.",
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
    images: ["/agaseke.png"],
  },
  alternates: {
    canonical: "/",
  },
};

function page() {
  return (
    <>
      <HomeSchema />
      <LandingPage />
    </>
  );
}

export default page;
