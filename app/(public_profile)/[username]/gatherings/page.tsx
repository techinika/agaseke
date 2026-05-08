/* eslint-disable @typescript-eslint/no-explicit-any */
import GatheringsPage from "@/components/pages/public/GatheringsPage";
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
      title: `Gatherings | ${creator.name} (@${username}) | Agaseke`,
      description: `View upcoming gatherings and events by ${creator.name} on Agaseke.`,
      alternates: {
        canonical: `/${username}/gatherings`,
      },
      openGraph: {
        title: `Gatherings | ${creator.name} (@${username})`,
        url: `${baseUrl}/${username}/gatherings`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `Gatherings | ${username} | Agaseke`,
    };
  }
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <GatheringsPage username={username} />;
}

export default page;