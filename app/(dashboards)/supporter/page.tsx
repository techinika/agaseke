import AuthGuard from "@/auth/AuthGuard";
import SupporterSpace from "@/components/pages/Dashboards/SupporterSpace";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supporter Space | Agaseke for Creators",
  description: "Supporter Space on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Supporter Space | Agaseke for Creators",
    description: "Supporter Space on Agaseke.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/supporter",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Supporter Space",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supporter Space | Agaseke for Creators",
    description: "Supporter Space on Agaseke.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return (
    <AuthGuard>
      <SupporterSpace />
    </AuthGuard>
  );
}

export default page;
