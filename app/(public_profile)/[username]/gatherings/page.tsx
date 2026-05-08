/* eslint-disable @typescript-eslint/no-explicit-any */
import GatheringsPage from "@/components/pages/public/GatheringsPage";
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
      alternates: { canonical: `/${username}/gatherings` },
    };
  }
  
  const displayName = creator.name || username;
  const bio = creator.bio || `View upcoming events and gatherings by ${displayName} on Agaseke.`;
  const image = creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  return {
    title: `Events & Gatherings | ${displayName} (@${username}) | Agaseke`,
    description: bio,
    keywords: [displayName, username, "events", "gatherings", "meetups", "Agaseke"],
    alternates: {
      canonical: `/${username}/gatherings`,
      languages: { "en-RW": `/${username}/gatherings` },
    },
    openGraph: {
      title: `Events & Gatherings | ${displayName} (@${username})`,
      description: `RSVP to upcoming events and gatherings by ${displayName}.`,
      url: `${baseUrl}/${username}/gatherings`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName} on Agaseke` }],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Events | ${displayName} (@${username})`,
      description: bio,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GatheringsPage username={username} />;
}

export default page;