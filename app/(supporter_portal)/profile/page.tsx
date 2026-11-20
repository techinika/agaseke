import AuthGuard from "@/auth/AuthGuard";
import ProfileEditPage from "@/components/pages/ProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile | Agaseke for Creators",
  description: "Edit your profile on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "User Profile | Agaseke for Creators",
    description: "Edit your profile on Agaseke.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/profile",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke User Profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "User Profile | Agaseke for Creators",
    description: "Edit your profile on Agaseke.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return (
    <AuthGuard>
      <ProfileEditPage />
    </AuthGuard>
  );
}

export default page;
