export const revalidate = 300;

import { cache } from "react";
import PublicProfile from "@/components/pages/PublicProfile";
import { adminDb, admin } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";

const getCreatorData = cache(async (username: string) => {
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
    try {
      await adminDb.collection("activityLogs").add({
        level: "error",
        category: "system",
        message: `Public profile: Failed to fetch creator data for "${username}"`,
        metadata: { username, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack?.slice(0, 2000) : "" },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error("Error logging creator fetch failure:", logError);
    }
    return null;
  }
});

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function getPublicProfileData(username: string) {
  const data = await getCreatorData(username);
  if (!data) return null;

  const { creator, profile } = data;
  const creatorId = creator.uid as string;
  const handle = (creator.handle as string) || username;

  try {
    const [partnersSnap, postsSnap, referralSnap] = await Promise.all([
    adminDb
      .collection("creatorPartners")
      .where("creatorId", "==", creatorId)
      .where("featured", "==", true)
      .get(),
    adminDb
      .collection("creatorContent")
      .where("creatorId", "in", [handle, creatorId])
      .where("isPrivate", "==", false)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get(),
    profile?.referralCreator
      ? adminDb.collection("creators").doc(String(profile.referralCreator)).get()
      : Promise.resolve(null),
  ]);

  const partners = partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const publicPosts = postsSnap.docs.map((d) => {
    const post = d.data();
    return {
      id: d.id,
      ...post,
      createdAt: post.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });
  const referralId = referralSnap?.exists
    ? (referralSnap.data()?.uid as string) || null
    : null;

  return {
    creator: serialize(creator),
    profile: serialize(profile),
    partners: serialize(partners),
    publicPosts,
    referralId,
  };
  } catch (error) {
    console.error("Error fetching public profile data:", error);
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
  const country = creator.country || "RW";
  const countryName = creator.countryName || (country === "RW" ? "Rwanda" : "");
  const creatorTwitter = creator.socials?.twitter || null;

  const keywords = [
    displayName, username, "content creator",
    "support creator", "Agaseke", "African content creator",
    ...(countryName ? [countryName, `${countryName} creator`, `${countryName} influencer`] : []),
  ];
  if (verified) keywords.push("verified creator");

  const title = verified
    ? `${displayName} (@${username}) | Agaseke`
    : `${displayName} (@${username}) | Agaseke`;

  return {
    title,
    description: bio,
    keywords,
    authors: [{ name: displayName, url: `${baseUrl}/${username}` }],
    alternates: {
      canonical: `${baseUrl}/${username}`,
    },
    openGraph: {
      title: `${displayName} (@${username})`,
      description: bio,
      url: `${baseUrl}/${username}`,
      siteName: "Agaseke",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${displayName} on Agaseke`,
        },
      ],
      locale: `en_${country}`,
      countryName: countryName || undefined,
      type: "profile",
      username: username,
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} (@${username})`,
      description: bio,
      images: [image],
      site: "@Agaseke_support",
      ...(creatorTwitter && { creator: `@${creatorTwitter.replace(/^@/, "")}` }),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: { "theme-color": "#ea580c" },
    category: "Creator Profile",
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicProfileData(username);

  if (!data) {
    return <PublicProfile username={username} />;
  }

  return (
    <PublicProfile
      username={username}
      initialCreator={data.creator}
      initialProfile={data.profile}
      initialPartners={data.partners}
      initialPublicPosts={data.publicPosts}
      initialReferralId={data.referralId}
    />
  );
}

export default page;