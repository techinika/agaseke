/* eslint-disable @typescript-eslint/no-explicit-any */
import GatheringsPage from "@/components/pages/public/GatheringsPage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `Events & Gatherings | ${username} | Agaseke`,
    description: `RSVP to events and gatherings by ${username} on Agaseke.`,
    keywords: [username, "events", "gatherings", "meetups", "Agaseke"],
    alternates: {
      canonical: `/${username}/gatherings`,
      languages: { "en-RW": `/${username}/gatherings` },
    },
    openGraph: {
      title: `Events | ${username} | Agaseke`,
      description: `RSVP to events by ${username}.`,
      url: `${baseUrl}/${username}/gatherings`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary", title: `Events | ${username}` },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GatheringsPage username={username} />;
}

export default page;