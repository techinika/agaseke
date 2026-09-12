export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import GiveawayDetailPage from "@/components/pages/public/GiveawayDetailPage";
import GiveawaySchema from "@/components/seo/GiveawaySchema";

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
  const image = (giveaway as any).coverUrl || (giveaway as any).imageUrl || creator.profilePicture || `${baseUrl}/agaseke.png`;

  return {
    title: `${title} | ${displayName} Giveaway | Agaseke`,
    description: `Enter to win ${title} by ${displayName} on Agaseke.`,
    alternates: { canonical: `/${username}/giveaways/${giveawayId}` },
    keywords: [displayName, username, title, "giveaway", "contest", "win", "Agaseke"],
    openGraph: {
      title: `${title} | ${displayName}`,
      description: `Enter to win ${title} by ${displayName}.`,
      url: `${baseUrl}/${username}/giveaways/${giveawayId}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 400, height: 400, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${displayName}`,
      description: `Enter to win ${title} by ${displayName}.`,
      images: [creator.profilePicture || `${baseUrl}/agaseke.png`],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; giveawayId: string }> }) {
  const { username, giveawayId } = await params;
  const [creator, giveaway] = await Promise.all([getCreatorData(username), getGiveaway(giveawayId)]);
  const displayName = creator?.name || username;
  const title = (giveaway as any)?.title || "Giveaway";

  const toDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value.toDate) return value.toDate();
    if (typeof value === "string") return new Date(value);
    if (value instanceof Date) return value;
    return undefined;
  };

  return (
    <>
      <GiveawaySchema
        title={title}
        description={(giveaway as any)?.description || `Enter to win ${title} by ${displayName} on Agaseke.`}
        url={`/${username}/giveaways/${giveawayId}`}
        organizerName={displayName}
        organizerUrl={`/${username}`}
        startDate={toDate((giveaway as any)?.startDate || (giveaway as any)?.createdAt)}
        endDate={toDate((giveaway as any)?.endDate)}
        prizeValue={(giveaway as any)?.prizeValue as number | undefined}
      />
      <GiveawayDetailPage username={username} giveawayId={giveawayId} />
    </>
  );
}

export default page;
