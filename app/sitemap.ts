import { MetadataRoute } from "next";
import { adminDb } from "@/db/firebaseAdmin";
import { baseUrl } from "@/lib/baseUrl";

export const revalidate = 3600;

const lastMod = (
  data:
    | { updatedAt?: { toDate?: () => Date }; createdAt?: { toDate?: () => Date } }
    | undefined,
): Date => data?.updatedAt?.toDate?.() || data?.createdAt?.toDate?.() || new Date();

function getStaticPages(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/explore/posts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/help-center`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/payout-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/content-guidelines`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [...getStaticPages()];

  try {
    const creatorsSnap = await adminDb
      .collection("creators")
      .select("name", "uid", "bookingEnabled", "updatedAt", "createdAt")
      .get();

    const uidToUsername = new Map<string, string>();

    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      const username = doc.id;
      if (!data?.name || !data?.uid) continue;

      uidToUsername.set(String(data.uid), username);
      uidToUsername.set(username, username);

      entries.push({
        url: `${baseUrl}/${username}`,
        lastModified: lastMod(data),
        changeFrequency: "weekly",
        priority: 0.8,
      });

      if (data.bookingEnabled) {
        entries.push({
          url: `${baseUrl}/${username}/booking`,
          lastModified: lastMod(data),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }

    const [productSnap, contentSnap, giveawaySnap, gatheringSnap] = await Promise.all([
      adminDb
        .collection("storeProducts")
        .where("active", "==", true)
        .select("creatorId", "updatedAt", "createdAt")
        .get()
        .catch(() => null),
      adminDb
        .collection("creatorContent")
        .where("isPrivate", "==", false)
        .select("creatorId", "type", "slug", "status", "updatedAt", "createdAt")
        .get()
        .catch(() => null),
      adminDb
        .collection("giveaways")
        .select("creatorId", "updatedAt", "createdAt")
        .get()
        .catch(() => null),
      adminDb
        .collection("creatorGatherings")
        .select("creatorId", "updatedAt", "createdAt")
        .get()
        .catch(() => null),
    ]);

    if (productSnap) {
      for (const doc of productSnap.docs) {
        const data = doc.data();
        const username = uidToUsername.get(String(data.creatorId || ""));
        if (!username) continue;
        entries.push({
          url: `${baseUrl}/${username}/store/${doc.id}`,
          lastModified: lastMod(data),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    if (contentSnap) {
      for (const doc of contentSnap.docs) {
        const data = doc.data();
        if (data.status === "draft") continue;

        if (data.type === "article" && data.slug) {
          entries.push({
            url: `${baseUrl}/articles/${data.slug}`,
            lastModified: lastMod(data),
            changeFrequency: "monthly",
            priority: 0.7,
          });
          continue;
        }

        const username = uidToUsername.get(String(data.creatorId || ""));
        if (!username) continue;
        entries.push({
          url: `${baseUrl}/${username}/community/${doc.id}`,
          lastModified: lastMod(data),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }

    if (giveawaySnap) {
      for (const doc of giveawaySnap.docs) {
        const data = doc.data();
        const username = uidToUsername.get(String(data.creatorId || ""));
        if (!username) continue;
        entries.push({
          url: `${baseUrl}/${username}/giveaways/${doc.id}`,
          lastModified: lastMod(data),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }

    if (gatheringSnap) {
      for (const doc of gatheringSnap.docs) {
        const data = doc.data();
        const username = uidToUsername.get(String(data.creatorId || ""));
        if (!username) continue;
        entries.push({
          url: `${baseUrl}/${username}/gatherings/${doc.id}`,
          lastModified: lastMod(data),
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return entries;
}
