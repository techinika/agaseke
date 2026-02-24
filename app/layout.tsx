import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthContext";
import { Toaster } from "sonner";
import { baseUrl } from "./sitemap";
import { GoogleAnalytics } from "@next/third-parties/google";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agaseke.me"),
  title: {
    default: "Agaseke: Monetize Content and Support Content Creators in Rwanda",
    template: "%s | Agaseke",
  },
  description:
    "Empowering the next generation of Rwandan digital creators. Monetize your content, connect with your audience, and grow your brand in Kigali and beyond.",
  keywords: [
    "Agaseke",
    "Rwandan creators",
    "Monetize content Rwanda",
    "Kigali influencers",
    "Support African artists",
    "Digital tips Rwanda",
    "Agseke for Creators",
    "Content Monetization in Rwanda",
    "Exclusive Content from Creators",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Agaseke: Monetize Content and Support Content Creators in Rwanda'",
    description:
      "The premier platform for Rwandan digital talent to monetize and grow.",
    url: "https://agaseke.me",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png", // Ensure this exists in your public folder
        width: 1200,
        height: 630,
        alt: "Agaseke Creator Platform",
      },
    ],
    locale: "en_RW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | Rwandan Creator Platform",
    description: "Monetize your creative work in Rwanda.",
    images: ["/agaseke.png"],
    creator: "@Agaseke_support",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rubik.variable} antialiased`}>
        <AuthProvider>
          <Toaster richColors position="top-center" />
          {children}
        </AuthProvider>
      </body>
      <GoogleAnalytics gaId="G-6DP23NWS5P" />
    </html>
  );
}
