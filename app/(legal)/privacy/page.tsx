import PrivacyPage from "@/components/pages/Legal/PrivacyPage";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const metadata: Metadata = {
  title: "Privacy Policy | Agaseke",
  description:
    "Learn how Agaseke collects, uses, and protects your personal information. We are committed to protecting your privacy as a creator or supporter on our platform.",
  keywords: [
    "privacy policy",
    "data protection",
    "Agaseke privacy",
    "personal information",
    "data security",
    "GDPR compliance",
    "Rwanda data protection",
  ],
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Agaseke",
    description:
      "Learn how Agaseke collects, uses, and protects your personal information.",
    url: `${baseUrl}/privacy`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function page() {
  return <PrivacyPage />;
}
