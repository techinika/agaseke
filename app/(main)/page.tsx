import LandingPage from "@/components/pages/LandingPage";
import HomeSchema from "@/components/seo/HomeSchema";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agaseke | Fuel Your Creativity with Community Support",
  description:
    "The easiest way for fans in Rwanda to support creators. Claim your page and start receiving gifts via MoMo and Card. Join thousands of creators building sustainable careers.",
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "Agaseke",
    title: "Agaseke | Fuel Your Creativity with Community Support",
    description:
      "The premier platform for Rwandan creators to monetize their content and grow their community.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke - Support Rwandan Creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | Fuel Your Creativity with Community Support",
    description:
      "The premier platform for Rwandan creators to monetize their content.",
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
