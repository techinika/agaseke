import LandingPage from "@/components/pages/LandingPage";
import HomeSchema from "@/components/seo/HomeSchema";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agaseke | African Creator Community & Monetization Platform",
  description:
    "Agaseke is the premier African creator economy platform. Build a private community, publish exclusive content, and earn from your biggest fans through subscriptions, tips, and digital sales — paid directly to Mobile Money or Bank.",
  keywords: [
    "African creator platform",
    "creator economy Africa",
    "monetize content Africa",
    "private community for creators",
    "Rwanda creator platform",
    "support African creators",
    "content monetization",
    "fan support platform",
    "creator payments Africa",
    "MTN MoMo creator",
    "Airtel Money creator",
  ],
  openGraph: {
    type: "website",
    locale: "en_RW",
    countryName: "Rwanda",
    siteName: "Agaseke",
    title: "Agaseke | African Creator Community & Monetization Platform",
    description:
      "Agaseke empowers African creators to build private communities and earn directly from their biggest fans — no algorithm, no ads. Subscribe, tip, shop, and connect.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke - African Creator Community Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | African Creator Community & Monetization Platform",
    description:
      "Agaseke empowers African creators to build private communities and earn directly from their biggest fans — no ads, no algorithm. Subscribe, tip, shop, and connect.",
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
    images: ["/agaseke.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  category: "Creator Economy",
  classification: "Creator Monetization Platform",
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
