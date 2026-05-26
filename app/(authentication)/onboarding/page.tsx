import AuthGuard from "@/auth/AuthGuard";
import CreatorOnboarding from "@/components/pages/StartPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Onboarding | Agaseke for Creators",
  description: "Creator Onboarding on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Creator Onboarding | Agaseke for Creators",
    description: "Creator Onboarding on Agaseke.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/onboarding",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Onboarding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Onboarding | Agaseke for Creators",
    description: "Creator Onboarding on Agaseke.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return (
    <AuthGuard>
      <CreatorOnboarding />
    </AuthGuard>
  );
}

export default page;
