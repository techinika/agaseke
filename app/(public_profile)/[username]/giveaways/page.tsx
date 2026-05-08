/* eslint-disable @typescript-eslint/no-explicit-any */
import GiveawaysPage from "@/components/pages/public/GiveawaysPage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `Giveaways | ${username} | Agaseke`,
    description: `Enter giveaways and win prizes from ${username} on Agaseke.`,
    keywords: [username, "giveaways", "contests", "win", "prizes", "Agaseke"],
    alternates: { canonical: `/${username}/giveaways` },
    openGraph: {
      title: `Giveaways | ${username} | Agaseke`,
      description: `Enter to win! Browse giveaways by ${username}.`,
      url: `${baseUrl}/${username}/giveaways`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary" },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GiveawaysPage username={username} />;
}

export default page;