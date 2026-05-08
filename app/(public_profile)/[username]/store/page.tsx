/* eslint-disable @typescript-eslint/no-explicit-any */
import StorePage from "@/components/pages/public/StorePage";
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
      title: "Store | Not Found | Agaseke",
      robots: { index: false, follow: false },
    };
  }
  
  const displayName = creator.name || username;
  const bio = creator.bio || `Shop digital products and merchandise from ${displayName} on Agaseke.`;
  const image = creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  return {
    title: `Shop | ${displayName} Store | Agaseke`,
    description: bio,
    keywords: [displayName, username, "shop", "store", "products", "digital", "merchandise", "Agaseke"],
    alternates: {
      canonical: `/${username}/store`,
      languages: { "en-RW": `/${username}/store` },
    },
    openGraph: {
      title: `Shop | ${displayName} Store`,
      description: `Browse and purchase from ${displayName}'s store.`,
      url: `${baseUrl}/${username}/store`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName}'s Store on Agaseke` }],
      type: "website",
    },
    twitter: { card: "summary", title: `Shop | ${displayName}`, description: bio, images: [image] },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <StorePage username={username} />;
}

export default page;