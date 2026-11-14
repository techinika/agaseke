import { CreatorHome } from "@/features/creator-home";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Home | Agaseke for Creators",
  description: "Creator Home on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Creator Home | Agaseke for Creators",
    description: "Creator Home on Agaseke.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/creator",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Creator Home",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Home | Agaseke for Creators",
    description: "Creator Home on Agaseke.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return <CreatorHome />;
}

export default page;
