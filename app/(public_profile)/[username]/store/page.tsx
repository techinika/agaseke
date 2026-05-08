/* eslint-disable @typescript-eslint/no-explicit-any */
import StorePage from "@/components/pages/public/StorePage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `Shop | ${username} | Agaseke Store`,
    description: `Shop products from ${username} on Agaseke.`,
    keywords: [username, "shop", "store", "products", "digital", "merchandise", "Agaseke"],
    alternates: { canonical: `/${username}/store` },
    openGraph: {
      title: `Shop | ${username} Store`,
      description: `Shop from ${username}'s store.`,
      url: `${baseUrl}/${username}/store`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary" },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <StorePage username={username} />;
}

export default page;