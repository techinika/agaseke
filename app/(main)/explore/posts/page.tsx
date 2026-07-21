import ExplorePostsPage from "@/components/pages/ExplorePostsPage";
import ExplorePostsSchema from "@/components/seo/ExplorePostsSchema";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const metadata: Metadata = {
  title: "Discover Public Posts from African Creators | Agaseke",
  description:
    "Browse public posts from creators across Africa. Read stories, watch videos, view images, and discover the talent shaping the continent.",
  keywords: [
    "African creators",
    "public posts Africa",
    "creator content",
    "discover creators",
    "African stories",
    "creator platform Africa",
    "Agaseke posts",
  ],
  alternates: {
    canonical: "/explore/posts",
  },
  openGraph: {
    title: "Discover Public Posts from African Creators | Agaseke",
    description:
      "Browse public posts from creators across Africa. Read stories, watch videos, view images, and discover the talent shaping the continent.",
    url: `${baseUrl}/explore/posts`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Discover Posts on Agaseke",
      },
    ],
    locale: "en_RW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Public Posts from African Creators | Agaseke",
    description:
      "Browse public posts from creators across Africa.",
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

export default function Page() {
  return (
    <>
      <ExplorePostsSchema />
      <ExplorePostsPage />
    </>
  );
}
