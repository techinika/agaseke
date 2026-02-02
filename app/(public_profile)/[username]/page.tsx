import PublicProfile from "@/components/pages/PublicProfile";
import { db } from "@/db/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Metadata } from "next";

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
    };
  }

  const profileRef = doc(db, "profiles", creator?.uid);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.data();

  const title = `${creator.name} (@${username}) | Agaseke for Creators`;
  const description =
    creator.bio ||
    `Support ${creator.name} on Agaseke. Fueling Rwandan creativity one contribution at a time.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [profile?.photoURL || "/agaseke.png"],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [profile?.photoURL || "/agaseke.png"],
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
