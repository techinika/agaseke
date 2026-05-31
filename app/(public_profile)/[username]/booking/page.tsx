/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import BookingPage from "@/components/pages/public/BookingPage";

async function getCreatorData(username: string) {
  try {
    // 1. Try direct lookup by document ID (handle)
    const snap = await adminDb.collection("creators").doc(username).get();
    if (snap.exists) return snap.data();

    // 2. Look up profiles by username to find the uid, then find the creator
    const profileQuery = await adminDb
      .collection("profiles")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (!profileQuery.empty) {
      const profile = profileQuery.docs[0].data();
      if (profile?.uid) {
        const byUid = await adminDb.collection("creators").where("uid", "==", profile.uid).limit(1).get();
        if (!byUid.empty) return byUid.docs[0].data();
      }
    }

    // 3. Fallback: try treating the param as a raw uid
    const raw = await adminDb.collection("creators").where("uid", "==", username).limit(1).get();
    if (!raw.empty) return raw.docs[0].data();

    return null;
  } catch (error) {
    console.error("Error fetching creator data:", error);
    return null;
  }
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
      images: [
        {
          url: creator.profilePicture || `${baseUrl}/agaseke.png`,
          width: 400,
          height: 400,
          alt: displayName,
        },
      ],
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
  const creator = JSON.parse(JSON.stringify(await getCreatorData(username)));
  return <BookingPage username={username} creator={creator} />;
}

export default page;
