import PublicProfile from "@/components/pages/PublicProfile";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const creatorRef = doc(db, "creators", username);
  const creatorSnap = await getDoc(creatorRef);
  const creator = creatorSnap.data();

  if (!creator) {
    return {
      title: "Creator Not Found | Agaseke",
      description: "This creator page could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const profileRef = doc(db, "profiles", creator?.uid);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.data();

  const displayName = creator.name;
  const verified = creator.verified || false;
  const bio = creator.bio || `Support ${displayName} on Agaseke. Fueling Rwandan creativity one contribution at a time.`;
  const image = profile?.photoURL || creator.profilePicture || "/agaseke.png";

  const title = verified
    ? `✓ ${displayName} (@${username}) | Agaseke`
    : `${displayName} (@${username}) | Agaseke`;

  const keywords = [
    displayName,
    username,
    "Rwandan creator",
    "support creator Rwanda",
    creator.bio?.split(" ").slice(0, 5).join(" ") || "content creator",
  ];

  return {
    title,
    description: bio,
    keywords,
    authors: [{ name: displayName }],
    alternates: {
      canonical: `/${username}`,
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
      firstName: displayName.split(" ")[0],
      username,
    },
    twitter: {
      card: "summary",
      title,
      description: bio,
      images: [image],
      site: "@Agaseke_support",
      creator: creator.socials?.twitter
        ? `@${creator.socials.twitter}`
        : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
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
