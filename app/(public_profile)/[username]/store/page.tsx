/* eslint-disable @typescript-eslint/no-explicit-any */
import StorePage from "@/components/pages/public/StorePage";
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/app/sitemap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/db/firebase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    const creatorRef = doc(db, "creators", username as string);
    const creatorSnap = await getDoc(creatorRef);
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
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `Store | ${username} | Agaseke`,
    };
  }
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <StorePage username={username} />;
}

export default page;
