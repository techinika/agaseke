import LoginPage from "@/components/pages/LoginPage";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Agaseke for Creators",
  description: "Access your Agaseke account to support your favorite creators.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Login | Agaseke for Creators",
    description: "Access your Agaseke account to support your favorite creators.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/login",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Login",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Login | Agaseke for Creators",
    description: "Access your Agaseke account to support your favorite creators.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return (
    <div>
      <LoginPage />
    </div>
  );
}

export default page;
