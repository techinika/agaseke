import { MetadataRoute } from "next";
import { adminDb } from "@/db/firebaseAdmin";
import { baseUrl } from "@/lib/baseUrl";

export { baseUrl };

export async function generateSitemaps() {
  return [
    { id: "static" },
    { id: "creators" },
    { id: "products" },
    { id: "posts" },
    { id: "giveaways" },
    { id: "gatherings" },
  ];
}

export default async function sitemap({
  id,
}: {
  id: string;
}): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case "static":
      return getStaticPages();
    case "creators":
      return getCreatorPages();
    case "products":
      return getProductPages();
    case "posts":
      return getPostPages();
    case "giveaways":
      return getGiveawayPages();
    case "gatherings":
      return getGatheringPages();
    default:
      return [];
  }
}

function getStaticPages(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/help-center`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/payout-policy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${baseUrl}/changelog`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
  ];
}

async function getCreatorPages(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    const creatorsSnap = await adminDb.collection("creators").get();
    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      const username = doc.id;
      if (!data?.name || !data?.uid) continue;

      entries.push({
        url: `${baseUrl}/${username}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
      entries.push({
        url: `${baseUrl}/${username}/community`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
      if (data.storeEnabled) {
        entries.push({
          url: `${baseUrl}/${username}/store`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        });
      }
      if (data.gatheringsEnabled) {
        entries.push({
          url: `${baseUrl}/${username}/gatherings`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        });
      }
      if (data.giveawayEnabled) {
        entries.push({
          url: `${baseUrl}/${username}/giveaways`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        });
      }
      if (data.bookingEnabled) {
        entries.push({
          url: `${baseUrl}/${username}/booking`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    console.error("Error generating creators sitemap:", error);
  }
  return entries;
}

async function getProductPages(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    const creatorsSnap = await adminDb.collection("creators").get();
    const uidToUsername = new Map<string, string>();
    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      if (data?.uid) uidToUsername.set(data.uid, doc.id);
    }

    const productSnap = await adminDb
      .collection("storeProducts")
      .where("active", "==", true)
      .get();
    for (const doc of productSnap.docs) {
      const data = doc.data();
      const username = uidToUsername.get(data.creatorId);
      if (!username) continue;
      entries.push({
        url: `${baseUrl}/${username}/store/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("Error generating products sitemap:", error);
  }
  return entries;
}

async function getPostPages(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    const creatorsSnap = await adminDb.collection("creators").get();
    const uidToUsername = new Map<string, string>();
    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      if (data?.uid) uidToUsername.set(data.uid, doc.id);
    }

    const postSnap = await adminDb
      .collection("creatorContent")
      .where("isPrivate", "==", false)
      .get();
    for (const doc of postSnap.docs) {
      const data = doc.data();
      const username = uidToUsername.get(data.creatorId);
      if (!username) continue;
      entries.push({
        url: `${baseUrl}/${username}/community/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error("Error generating posts sitemap:", error);
  }
  return entries;
}

async function getGiveawayPages(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    const creatorsSnap = await adminDb.collection("creators").get();
    const uidToUsername = new Map<string, string>();
    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      if (data?.uid) uidToUsername.set(data.uid, doc.id);
    }

    const giveawaySnap = await adminDb.collection("giveaways").get();
    for (const doc of giveawaySnap.docs) {
      const data = doc.data();
      const username = uidToUsername.get(data.creatorId);
      if (!username) continue;
      entries.push({
        url: `${baseUrl}/${username}/giveaways/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error("Error generating giveaways sitemap:", error);
  }
  return entries;
}

async function getGatheringPages(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    const creatorsSnap = await adminDb.collection("creators").get();
    const uidToUsername = new Map<string, string>();
    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      if (data?.uid) uidToUsername.set(data.uid, doc.id);
    }

    const gatheringSnap = await adminDb.collection("creatorGatherings").get();
    for (const doc of gatheringSnap.docs) {
      const data = doc.data();
      const username = uidToUsername.get(data.creatorId);
      if (!username) continue;
      entries.push({
        url: `${baseUrl}/${username}/gatherings/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error("Error generating gatherings sitemap:", error);
  }
  return entries;
}
