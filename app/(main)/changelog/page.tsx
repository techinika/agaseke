import ChangelogPage from "@/components/pages/ChangelogPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Agaseke",
  description:
    "Track Agaseke's progress. See current features and what's coming next.",
  openGraph: {
    title: "Changelog | Agaseke",
    description:
      "Track Agaseke's progress. See current features and what's coming next.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/changelog",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Changelog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog | Agaseke",
    description:
      "Track Agaseke's progress. See current features and what's coming next.",
    images: ["/agaseke.png"],
  },
};

export default function page() {
  return <ChangelogPage />;
}
