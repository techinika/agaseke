export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import GatheringDetailPage from "@/components/pages/public/GatheringDetailPage";

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

async function getGathering(gatheringId: string) {
  try {
    const snap = await adminDb.collection("creatorGatherings").doc(gatheringId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; gatheringId: string }>;
}): Promise<Metadata> {
  const { username, gatheringId } = await params;
  const [creator, gathering] = await Promise.all([getCreatorData(username), getGathering(gatheringId)]);

  if (!creator || !gathering) {
    return { title: "Event | Not Found | Agaseke", robots: { index: false } };
  }

  const displayName = creator.name || username;
  const title = (gathering as any).title || "Event";

  return {
    title: `${title} | ${displayName} Events | Agaseke`,
    description: `RSVP to ${title} by ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/gatherings/${gatheringId}` },
    openGraph: {
      title: `${title} | ${displayName}`,
      description: `RSVP to ${title} by ${displayName}.`,
      url: `${baseUrl}/${username}/gatherings/${gatheringId}`,
      siteName: "Agaseke",
      images: [{ url: creator.profilePicture || `${baseUrl}/agaseke.png`, width: 400, height: 400, alt: displayName }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${displayName}`,
      description: `RSVP to ${title} by ${displayName}.`,
      images: [creator.profilePicture || `${baseUrl}/agaseke.png`],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; gatheringId: string }> }) {
  const { username, gatheringId } = await params;
  return <GatheringDetailPage username={username} gatheringId={gatheringId} />;
}

export default page;
