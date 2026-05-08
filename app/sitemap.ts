import { MetadataRoute } from "next";
import { adminDb } from "@/db/firebaseAdmin";

export const baseUrl = "https://agaseke.me";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  try {
    const creatorsSnap = await adminDb.collection("creators").get();

    for (const doc of creatorsSnap.docs) {
      const data = doc.data();
      const username = doc.id;

      if (!data?.name) continue;

      // Main profile
      sitemapEntries.push({
        url: `${baseUrl}/${username}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });

      // Community subpage
      sitemapEntries.push({
        url: `${baseUrl}/${username}/community`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      });

      // Store subpage
      if (data.storeEnabled) {
        sitemapEntries.push({
          url: `${baseUrl}/${username}/store`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.7,
        });
      }

      // Gatherings subpage
      if (data.gatheringsEnabled) {
        sitemapEntries.push({
          url: `${baseUrl}/${username}/gatherings`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        });
      }

      // Giveaways subpage
      if (data.giveawayEnabled) {
        sitemapEntries.push({
          url: `${baseUrl}/${username}/giveaways`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  const staticPages: MetadataRoute.Sitemap = [
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
  ];

  return [...staticPages, ...sitemapEntries];
}
