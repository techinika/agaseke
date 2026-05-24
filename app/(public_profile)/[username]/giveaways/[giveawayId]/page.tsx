/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import GiveawayDetailPage from "@/components/pages/public/GiveawayDetailPage";

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

async function getGiveaway(giveawayId: string) {
  try {
    const snap = await adminDb.collection("giveaways").doc(giveawayId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; giveawayId: string }>;
}): Promise<Metadata> {
  const { username, giveawayId } = await params;
  const [creator, giveaway] = await Promise.all([getCreatorData(username), getGiveaway(giveawayId)]);

  if (!creator || !giveaway) {
    return { title: "Giveaway | Not Found | Agaseke", robots: { index: false } };
  }

  const displayName = creator.name || username;
  const title = (giveaway as any).title || "Giveaway";

  return {
    title: `${title} | ${displayName} Giveaway | Agaseke`,
    description: `Enter to win ${title} by ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/giveaways/${giveawayId}` },
    openGraph: {
      title: `${title} | ${displayName}`,
      description: `Enter to win ${title} by ${displayName}.`,
      url: `${baseUrl}/${username}/giveaways/${giveawayId}`,
      siteName: "Agaseke",
      images: [{ url: creator.profilePicture || `${baseUrl}/agaseke.png`, width: 400, height: 400, alt: displayName }],
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; giveawayId: string }> }) {
  const { username, giveawayId } = await params;
  return <GiveawayDetailPage username={username} giveawayId={giveawayId} />;
}

export default page;
