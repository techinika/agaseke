import HelpCenter from "@/components/pages/HelpCenterPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | Agaseke for Creators",
  description:
    "Find answers and get support for Agaseke for Creators creators and supporters.",
  openGraph: {
    title: "Help Center | Agaseke for Creators",
    description:
      "Find answers and get support for Agaseke for Creators creators and supporters.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/help-center",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Help Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center | Agaseke for Creators",
    description:
      "Find answers and get support for Agaseke for Creators creators and supporters.",
    images: ["/agaseke.png"],
  },
};

export default function page() {
  return <HelpCenter />;
}
