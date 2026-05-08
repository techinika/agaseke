/* eslint-disable @typescript-eslint/no-explicit-any */
import GiveawaysPage from "@/components/pages/public/GiveawaysPage";
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
      };
    }

    return {
      title: `Giveaways | ${creator.name} (@${username}) | Agaseke`,
      description: `View ${creator.name}'s giveaways and past winners on Agaseke.`,
      alternates: {
        canonical: `/${username}/giveaways`,
      },
      openGraph: {
        title: `Giveaways | ${creator.name} (@${username})`,
        url: `${baseUrl}/${username}/giveaways`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `Giveaways | ${username} | Agaseke`,
    };
  }
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GiveawaysPage username={username} />;
}

export default page;