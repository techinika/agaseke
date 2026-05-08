import PublicProfile from "@/components/pages/PublicProfile";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    const creatorSnap = await adminDb.collection("creators").doc(username).get();
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

    const profileSnap = await adminDb.collection("profiles").doc(creator?.uid).get();
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
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `${username} | Agaseke`,
      description: `Support ${username} on Agaseke.`,
    };
  }
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