/* eslint-disable @typescript-eslint/no-explicit-any */
import GiveawaysPage from "@/components/pages/public/GiveawaysPage";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

async function getCreatorData(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    if (!creatorSnap.exists) return null;
    return creatorSnap.data();
  } catch (error) {
    console.error("Error fetching creator for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorData(username);
  
  if (!creator) {
    return {
      title: "Creator Not Found | Agaseke",
      description: "This creator page could not be found.",
      robots: { index: false, follow: false },
      alternates: { canonical: `/${username}/giveaways` },
    };
  }
  
  const displayName = creator.name || username;
  const bio = creator.bio || `Enter giveaways and contests by ${displayName} on Agaseke.`;
  const image = creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  return {
    title: `Giveaways & Contests | ${displayName} (@${username}) | Agaseke`,
    description: bio,
    keywords: [displayName, username, "giveaways", "contests", "win", "prizes", "Agaseke"],
    alternates: {
      canonical: `/${username}/giveaways`,
      languages: { "en-RW": `/${username}/giveaways` },
    },
    openGraph: {
      title: `Giveaways & Contests | ${displayName} (@${username})`,
      description: `Enter to win prizes! Browse active and past giveaways by ${displayName}.`,
      url: `${baseUrl}/${username}/giveaways`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName}'s Giveaways on Agaseke` }],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Giveaways | ${displayName} (@${username})`,
      description: bio,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GiveawaysPage username={username} />;
}

export default page;