/* eslint-disable @typescript-eslint/no-explicit-any */
import MessagingPage from "@/components/pages/public/MessagingPage";
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
      alternates: { canonical: `/${username}/messaging` },
    };
  }
  
  const displayName = creator.name || username;
  
  return {
    title: `Message ${displayName} | Agaseke`,
    description: `Send a direct message to ${displayName} on Agaseke. Connect and communicate with the creator.`,
    keywords: [displayName, username, "message", "contact", "direct message", "Agaseke"],
    alternates: {
      canonical: `/${username}/messaging`,
      languages: { "en-RW": `/${username}/messaging` },
    },
    openGraph: {
      title: `Message ${displayName} | Agaseke`,
      description: `Send a direct message to ${displayName}. Connect and communicate with the creator on Agaseke.`,
      url: `${baseUrl}/${username}/messaging`,
      siteName: "Agaseke",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Message ${displayName} | Agaseke`,
      description: `Connect with ${displayName} on Agaseke.`,
    },
    robots: { index: false, follow: false }, // Don't index messaging pages
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <MessagingPage username={username} />;
}

export default page;