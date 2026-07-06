import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/auth/AuthContext";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import PwaRegister from "@/components/parts/PwaRegister";
import LoginRedirectCapture from "@/auth/LoginRedirectCapture";
import { ThemeProvider } from "next-themes";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Agaseke | Build Your Private Creator Community",
    template: "%s | Agaseke",
  },
  description:
    "A private community platform for content creators and influencers across Africa. Your biggest fans support you directly through tips, subscriptions, and exclusive content — paid out to your Mobile Money or Bank account.",
  keywords: [
    "Agaseke",
    "creator community platform",
    "private community for creators",
    "African content creators",
    "support creators Africa",
    "monetize content",
    "fan support platform",
    "exclusive content creators",
    "creator platform Africa",
    "support creators",
    "mobile money payments",
    "MTN MoMo",
    "Airtel Money",
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
      en: "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Agaseke",
    title: "Agaseke | Build Your Private Creator Community",
    description:
      "A private community platform for content creators across Africa. Your fans support you directly through tips, subscriptions, and purchases.",
    url: BASE_URL,
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke - Build Your Private Creator Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaseke | Build Your Private Creator Community",
    description:
      "A private community platform for creators across Africa. Your fans support you directly through tips, subscriptions, and exclusive content.",
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/agaseke.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Agaseke" />
        <meta name="apple-mobile-web-app-title" content="Agaseke" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${rubik.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Toaster richColors position="top-center" />
            {children}
            <PwaRegister />
            <LoginRedirectCapture />
          </AuthProvider>
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-6DP23NWS5P" />
    </html>
  );
}
