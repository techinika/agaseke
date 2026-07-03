import CreatorDashboard from "@/components/pages/Dashboards/CreatorSpace";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Space | Agaseke for Creators",
  description: "Creator Space on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Creator Space | Agaseke for Creators",
    description: "Creator Space on Agaseke.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/creator",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Creator Space",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Space | Agaseke for Creators",
    description: "Creator Space on Agaseke.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return (
    <div>
      <CreatorDashboard />
    </div>
  );
}

export default page;
