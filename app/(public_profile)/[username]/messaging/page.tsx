/* eslint-disable @typescript-eslint/no-explicit-any */
import MessagingPage from "@/components/pages/public/MessagingPage";
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
      title: `Message ${creator.name} | Agaseke`,
      description: `Send a message to ${creator.name} on Agaseke.`,
      alternates: {
        canonical: `/${username}/messaging`,
      },
      openGraph: {
        title: `Message ${creator.name} | Agaseke`,
        url: `${baseUrl}/${username}/messaging`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `Message | ${username} | Agaseke`,
    };
  }
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <MessagingPage username={username} />;
}

export default page;
