/* eslint-disable @typescript-eslint/no-explicit-any */
import CommunityPage from "@/components/pages/public/CommunityPage";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

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
      title: "Community | Not Found | Agaseke",
      robots: { index: false, follow: false },
    };
  }
  
  const displayName = creator.name || username;
  const bio = creator.bio || `View ${displayName}'s community posts and content on Agaseke.`;
  const image = creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  return {
    title: `Community | ${displayName} (@${username}) | Agaseke`,
    description: bio,
    keywords: [displayName, username, "community", "posts", "content", "Agaseke"],
    alternates: {
      canonical: `/${username}/community`,
      languages: { "en-RW": `/${username}/community` },
    },
    openGraph: {
      title: `Community | ${displayName} (@${username})`,
      description: `Browse all community posts from ${displayName}.`,
      url: `${baseUrl}/${username}/community`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName} on Agaseke` }],
      type: "website",
    },
    twitter: { card: "summary", title: `Community | ${displayName}`, description: bio, images: [image] },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CommunityPage username={username} />;
}

export default page;