import TermsPage from "@/components/pages/Legal/TermsPage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export const metadata: Metadata = {
  title: "Terms of Service | Agaseke",
  description:
    "Read our terms of service for using Agaseke. Understand the guidelines, rights, and responsibilities for creators and supporters on our platform.",
  keywords: [
    "terms of service",
    "terms and conditions",
    "Agaseke terms",
    "user agreement",
    "creator agreement",
    "Rwanda platform terms",
  ],
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Agaseke",
    description:
      "Read our terms of service for using Agaseke.",
    url: `${baseUrl}/terms`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function page() {
  return <TermsPage />;
}
