import ExplorePage from "@/components/pages/ExplorePage";
import ExploreSchema from "@/components/seo/ExploreSchema";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import { adminDb } from "@/db/firebaseAdmin";
import type { Creator } from "@/types/creator";

export const revalidate = 300;

async function getInitialCreators(): Promise<Creator[]> {
  try {
    const snap = await adminDb
      .collection("creators")
      .orderBy("name")
      .limit(12)
      .get();
    return snap.docs.map((doc) =>
      JSON.parse(JSON.stringify({ handle: doc.id, ...doc.data() })),
    ) as Creator[];
  } catch (error) {
    console.error("Error fetching initial creators:", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "Explore African Creators | Discover & Support | Agaseke",
  description:
    "Discover and support Africa's most talented creators. Browse artists, musicians, content creators, and storytellers. Your support fuels their creative journey.",
  keywords: [
    "African creators",
    "support creators Africa",
    "discover artists Africa",
    "African content creators",
    "African musicians",
    "creator platform Africa",
    "African storytellers",
    "Rwanda creators",
    "Kigali artists",
    "pan-African talent",
  ],
  alternates: {
    canonical: "/explore",
    languages: {
      "en-RW": "/explore",
    },
  },
  openGraph: {
    title: "Explore African Creators | Discover & Support | Agaseke",
    description:
      "Discover and support Africa's most talented creators. Browse artists, musicians, content creators, and storytellers.",
    url: `${baseUrl}/explore`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Explore Creators on Agaseke | Support African Talent",
      },
    ],
    locale: "en_RW",
    type: "website",
    countryName: "Rwanda",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore African Creators | Discover & Support | Agaseke",
    description:
      "Discover and support Africa's most talented creators.",
    images: ["/agaseke.png"],
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
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

async function page() {
  const initialCreators = await getInitialCreators();
  return (
    <>
      <ExploreSchema />
      <ExplorePage initialCreators={initialCreators} />
    </>
  );
}

export default page;
