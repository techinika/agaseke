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
  const data = await getCreatorData(username);
  
  if (!data) {
    return {
      title: "Creator Not Found | Agaseke",
      description: "This creator page could not be found.",
      robots: { index: false, follow: false },
      alternates: { canonical: `/${username}` },
    };
  }
  
  const { creator, profile } = data;
  const displayName = creator.name || username;
  const verified = creator.verified || false;
  const bio = creator.bio || `Support ${displayName} on Agaseke. Fueling Rwandan creativity one contribution at a time.`;
  const image = profile?.photoURL || creator.profilePicture || `${baseUrl}/agaseke.png`;
  
  const title = verified ? `✓ ${displayName} (@${username}) | Agaseke` : `${displayName} (@${username}) | Agaseke`;
  
  const keywords = [
    displayName,
    username,
    "Rwandan creator",
    "support creator Rwanda",
    creator.bio?.split(" ").slice(0, 5).join(" ") || "content creator",
    "Agaseke creator",
    "Rwanda creator",
  ].filter(Boolean);
  
  const twitterHandle = creator.socials?.twitter;
  
  return {
    title,
    description: bio,
    keywords,
    authors: [{ name: displayName }],
    alternates: {
      canonical: `/${username}`,
      languages: {
        "en-RW": `/${username}`,
      },
    },
    openGraph: {
      title,
      description: bio,
      url: `${baseUrl}/${username}`,
      siteName: "Agaseke",
      images: [
        {
          url: image,
          width: 400,
          height: 400,
          alt: `${displayName} on Agaseke`,
        },
      ],
      locale: "en_RW",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description: bio,
      images: [image],
      site: "@Agaseke_support",
      creator: twitterHandle ? `@${twitterHandle}` : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    },
    other: {
      "theme-color": "#ea580c",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <div>
      <PublicProfile username={username} />
    </div>
  );
}

export default page;