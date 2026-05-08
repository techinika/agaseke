/* eslint-disable @typescript-eslint/no-explicit-any */
import CommunityPage from "@/components/pages/public/CommunityPage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `Community | ${username} | Agaseke`,
    description: `Browse community posts and content from ${username} on Agaseke.`,
    keywords: [username, "community", "posts", "content", "Agaseke"],
    alternates: {
      canonical: `/${username}/community`,
      languages: { "en-RW": `/${username}/community` },
    },
    openGraph: {
      title: `Community | ${username} | Agaseke`,
      description: `Browse community posts from ${username}.`,
      url: `${baseUrl}/${username}/community`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary", title: `Community | ${username}` },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CommunityPage username={username} />;
}

export default page;