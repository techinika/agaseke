/* eslint-disable @typescript-eslint/no-explicit-any */
import StorePage from "@/components/pages/public/StorePage";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const creatorSnap = await adminDb.collection("creators").doc(username).get();
  const creator = creatorSnap.data();

  if (!creator) {
    return {
      title: "Creator Not Found | Agaseke",
    };
  }

  return {
    title: `Store | ${creator.name} (@${username}) | Agaseke`,
    description: `Shop ${creator.name}'s products and track your orders on Agaseke.`,
    alternates: {
      canonical: `/${username}/store`,
    },
    openGraph: {
      title: `Store | ${creator.name} (@${username})`,
      url: `${baseUrl}/${username}/store`,
    },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <StorePage username={username} />;
}

export default page;