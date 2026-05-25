/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import BookingPage from "@/components/pages/public/BookingPage";

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorData(username);
  const displayName = creator?.name || username;

  if (!creator) {
    return { title: "Booking | Not Found | Agaseke", robots: { index: false } };
  }

  return {
    title: `Book a Meeting | ${displayName} | Agaseke`,
    description: `Schedule a meeting with ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/booking` },
    openGraph: {
      title: `Book a Meeting | ${displayName}`,
      description: `Schedule a meeting with ${displayName}.`,
      url: `${baseUrl}/${username}/booking`,
      siteName: "Agaseke",
      images: [{ url: creator.profilePicture || `${baseUrl}/agaseke.png`, width: 400, height: 400, alt: displayName }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Book a Meeting | ${displayName}`,
      description: `Schedule a meeting with ${displayName}.`,
      images: [creator.profilePicture || `${baseUrl}/agaseke.png`],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const creator = await getCreatorData(username);
  return <BookingPage username={username} creator={creator} />;
}

export default page;
