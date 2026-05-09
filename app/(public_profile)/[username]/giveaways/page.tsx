/* eslint-disable @typescript-eslint/no-explicit-any */
import GiveawaysPage from "@/components/pages/public/GiveawaysPage";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

async function getCreatorData(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    return creatorSnap.exists ? creatorSnap.data() : null;
  } catch (error) {
    console.error("Error fetching creator:", error);
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
      title: "Giveaways | Not Found | Agaseke",
      robots: { index: false, follow: false },
    };
  }
  
  const displayName = creator.name || username;
  const bio = creator.bio || `Enter giveaways and win prizes from ${displayName} on Agaseke.`;
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
      title: `Giveaways | ${displayName} (@${username})`,
      description: `Enter to win! Browse giveaways by ${displayName}.`,
      url: `${baseUrl}/${username}/giveaways`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName}'s Giveaways on Agaseke` }],
      type: "website",
    },
    twitter: { card: "summary", title: `Giveaways | ${displayName}`, description: bio, images: [image] },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GiveawaysPage username={username} />;
}

export default page;