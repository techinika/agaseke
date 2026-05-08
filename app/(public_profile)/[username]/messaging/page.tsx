/* eslint-disable @typescript-eslint/no-explicit-any */
import MessagingPage from "@/components/pages/public/MessagingPage";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `Message | ${username} | Agaseke`,
    description: `Send a message to ${username} on Agaseke.`,
    keywords: [username, "message", "contact", "Agaseke"],
    alternates: { canonical: `/${username}/messaging` },
    openGraph: {
      title: `Message ${username} | Agaseke`,
      description: `Connect with ${username}.`,
      url: `${baseUrl}/${username}/messaging`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: { card: "summary" },
    robots: { index: false, follow: false }, // Noindex messaging
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <MessagingPage username={username} />;
}

export default page;