/* eslint-disable @typescript-eslint/no-explicit-any */
import CommunityPage from "@/components/pages/public/CommunityPage";
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
    };
  }

  return {
    title: `Community | ${creator.name} (@${username}) | Agaseke`,
    description: `View ${creator.name}'s community posts and public content on Agaseke.`,
    alternates: {
      canonical: `/${username}/community`,
    },
    openGraph: {
      title: `Community | ${creator.name} (@${username})`,
      url: `${baseUrl}/${username}/community`,
    },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CommunityPage username={username} />;
}

export default page;