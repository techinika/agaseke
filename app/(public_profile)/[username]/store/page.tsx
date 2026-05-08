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
    description: `Shop products from ${username} on Agaseke. Digital downloads, merchandise and more.`,
    keywords: [username, "shop", "store", "products", "digital", "merchandise", "Agaseke"],
    alternates: {
      canonical: `/${username}/store`,
      languages: { "en-RW": `/${username}/store` },
    },
    openGraph: {
      title: `Shop | ${username} Store`,
      description: `Shop from ${username}'s store on Agaseke.`,
      url: `${baseUrl}/${username}/store`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary", title: `Shop | ${username}` },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <StorePage username={username} />;
}

export default page;