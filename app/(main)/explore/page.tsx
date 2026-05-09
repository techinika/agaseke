import ExplorePage from "@/components/pages/ExplorePage";
import ExploreSchema from "@/components/seo/ExploreSchema";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const metadata: Metadata = {
  title: "Explore Rwandan Creators | Agaseke",
  description:
    "Discover and support talented creators in Rwanda. Browse artists, musicians, content creators, and more. Your support helps fuel their creative journey.",
  keywords: [
    "Rwandan creators",
    "support creators Rwanda",
    "discover artists Rwanda",
    "Kigali influencers",
    "African content creators",
    "Rwandan musicians",
    "creator platform Rwanda",
  ],
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title: "Explore Rwandan Creators | Agaseke",
    description:
      "Discover and support talented creators in Rwanda. Browse artists, musicians, content creators, and more.",
    url: `${baseUrl}/explore`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Explore Creators on Agaseke",
      },
    ],
    locale: "en_RW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Rwandan Creators | Agaseke",
    description:
      "Discover and support talented creators in Rwanda.",
    images: ["/agaseke.png"],
    site: "@Agaseke_support",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

function page() {
  return (
    <>
      <ExploreSchema />
      <ExplorePage />
    </>
  );
}

export default page;
