export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import GatheringDetailPage from "@/components/pages/public/GatheringDetailPage";
import EventSchema from "@/components/seo/EventSchema";

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
  const image = (gathering as any).coverUrl || creator.profilePicture || `${baseUrl}/agaseke.png`;

  return {
    title: `${title} | ${displayName} Events | Agaseke`,
    description: `RSVP to ${title} by ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/gatherings/${gatheringId}` },
    keywords: [displayName, username, title, "event", "gathering", "meetup", "Agaseke"],
    openGraph: {
      title: `${title} | ${displayName}`,
      description: `RSVP to ${title} by ${displayName}.`,
      url: `${baseUrl}/${username}/gatherings/${gatheringId}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: title }],
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
  const [creator, gathering] = await Promise.all([getCreatorData(username), getGathering(gatheringId)]);
  const displayName = creator?.name || username;
  const title = (gathering as any)?.title || "Event";

  return (
    <>
      <EventSchema
        name={title}
        description={(gathering as any)?.description || `RSVP to ${title} by ${displayName} on Agaseke.`}
        image={(gathering as any)?.coverUrl || creator?.profilePicture || `${baseUrl}/agaseke.png`}
        url={`/${username}/gatherings/${gatheringId}`}
        organizerName={displayName}
        organizerUrl={`/${username}`}
        startDate={
          (gathering as any)?.date
            ? new Date(`${(gathering as any).date}T${(gathering as any).time || "00:00"}`).toISOString()
            : undefined
        }
        location={(gathering as any)?.location || undefined}
      />
      <GatheringDetailPage username={username} gatheringId={gatheringId} />
    </>
  );
}

export default page;
