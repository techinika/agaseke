import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthContext";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Agaseke | Fuel Your Creativity with Community Support",
    template: "%s | Agaseke",
  },
  description:
    "The easiest way for fans in Rwanda to support creators. Claim your page and start receiving gifts via MoMo and Card. Join thousands of creators building sustainable careers.",
  keywords: [
    "Agaseke",
    "Rwandan creators",
    "Monetize content Rwanda",
    "Kigali influencers",
    "Support African artists",
    "Digital tips Rwanda",
    "Content Monetization Rwanda",
    "Exclusive Content Creators",
    "Creator platform Africa",
    "Support creators",
    "Mobile money payments",
    "MTN MoMo",
    "Airtel Money Rwanda",
  ],
  authors: [{ name: "Agaseke", url: BASE_URL }],
  creator: "Agaseke",
  publisher: "Agaseke",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-RW": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "Agaseke",
    title: "Agaseke | Fuel Your Creativity with Community Support",
    description:
      "The premier platform for Rwandan creators to monetize their content and grow their community.",
    url: BASE_URL,
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke - Support Rwandan Creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | Fuel Your Creativity with Community Support",
    description:
      "The premier platform for Rwandan creators to monetize their content.",
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
    images: ["/agaseke.png"],
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
  verification: {
    google: "google-site-verification-code",
  },
  category: "Entertainment",
  classification: "Creator Platform",
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/agaseke.png" />
      </head>
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
