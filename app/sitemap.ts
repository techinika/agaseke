import { MetadataRoute } from "next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/db/firebase";

export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agaseke.me";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const creatorsSnap = await getDocs(collection(db, "creators"));
  
  const creatorUrls: MetadataRoute.Sitemap = creatorsSnap.docs
    .filter((doc) => {
      const data = doc.data();
      return data && data.name && data.bio;
    })
    .map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });

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

  return [...staticPages, ...creatorUrls];
}
