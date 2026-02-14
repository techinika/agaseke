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
  title: "Agaseke for Creators | Support Rwandan Creativity",
  description:
    "The premier platform to support Rwandan creators, artists, and innovators. Fueling the local creative economy one contribution at a time.",
  keywords: [
    "Rwanda",
    "Creators",
    "Support",
    "MoMo",
    "Art",
    "Kigali",
    "Agaseke",
    "monetization in rwanda",
    "content creators in rwanda",
  ],
  openGraph: {
    title: "Agaseke for Creators | Empowering Rwandan Creators",
    description:
      "Join the community supporting the next generation of Rwandan talent.",
    url: baseUrl,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke for Creators Platform",
      },
    ],
    locale: "en_RW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke for Creators | Support Rwandan Creativity",
    description:
      "Empowering creators across Rwanda through direct community support.",
    images: ["/agaseke.png"],
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
