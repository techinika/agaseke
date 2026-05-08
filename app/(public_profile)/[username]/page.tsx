import PublicProfile from "@/components/pages/PublicProfile";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

async function getCreatorData(username: string) {
  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
    if (!creatorSnap.exists) return null;
    
    const creator = creatorSnap.data();
    if (!creator?.uid) return null;
    
    const profileSnap = await adminDb.collection("profiles").doc(creator.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;
    
    return { creator, profile };
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
  const data = await getCreatorData(username);
  
  if (!data) {
    return {
      title: "Creator Not Found | Agaseke",
      description: "This creator profile could not be found.",
      robots: { index: false, follow: false },
      alternates: { canonical: `/${username}` },
    };
  }
  
  const { creator, profile } = data;
  const displayName = creator.name || username;
  const verified = creator.verified || false;
  const bio = creator.bio || `Support ${displayName} on Agaseke.`;
  const image = profile?.photoURL || creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  const title = verified 
    ? `✓ ${displayName} (@${username}) | Agaseke` 
    : `${displayName} (@${username}) | Agaseke`;
  
  return {
    title,
    description: bio,
    keywords: [displayName, username, "Rwandan creator", "Rwanda", "content creator", "support creator", "Agaseke"],
    authors: [{ name: displayName }],
    alternates: {
      canonical: `/${username}`,
      languages: { "en-RW": `/${username}` },
    },
    openGraph: {
      title,
      description: bio,
      url: `${baseUrl}/${username}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: `${displayName} on Agaseke` }],
      locale: "en_RW",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description: bio,
      images: [image],
      site: "@Agaseke_support",
    },
    robots: { index: true, follow: true },
    other: { "theme-color": "#ea580c" },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PublicProfile username={username} />;
}

export default page;