import type { Metadata } from "next";
import ArticlesIndexPage from "@/components/pages/ArticlesIndexPage";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicArticles } from "@/lib/articleReader";
import { baseUrl } from "@/lib/baseUrl";
import { getBreadcrumbSchema, getOrganizationSchema } from "@/lib/schemas";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Creator Articles & Essays | Agaseke",
  description:
    "Read long-form articles, guides, and stories published directly by African creators on Agaseke.",
  keywords: [
    "African creator articles",
    "essays",
    "stories",
    "creator newsletters",
    "Agaseke articles",
    "Rwanda writers",
  ],
  alternates: {
    canonical: "/articles",
    languages: {
      "en-RW": "/articles",
    },
  },
  openGraph: {
    title: "Creator Articles & Essays | Agaseke",
    description:
      "Read long-form articles, guides, and stories published directly by African creators on Agaseke.",
    url: `${baseUrl}/articles`,
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Creator Articles & Essays on Agaseke",
      },
    ],
    locale: "en_RW",
    type: "website",
    countryName: "Rwanda",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creator Articles & Essays | Agaseke",
    description:
      "Read long-form articles, guides, and stories published directly by African creators on Agaseke.",
    images: ["/agaseke.png"],
    site: "@Agaseke_support",
    creator: "@Agaseke_support",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default async function ArticlesPage() {
  const articles = await getPublicArticles(40);

  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Articles", url: "/articles" },
  ]);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Creator Articles & Essays on Agaseke",
    description:
      "Long-form writing, guides, and essays published directly by creators on Agaseke.",
    url: `${baseUrl}/articles`,
    breadcrumb: breadcrumbs,
    publisher: getOrganizationSchema(),
  };

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={collectionSchema} />
      <ArticlesIndexPage initialArticles={articles} />
    </>
  );
}
