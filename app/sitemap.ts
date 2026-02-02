// app/sitemap.ts
import { MetadataRoute } from "next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/db/firebase";

export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const creatorsSnap = await getDocs(collection(db, "creators"));
  const creatorUrls = creatorsSnap.docs.map((doc) => ({
    url: `${baseUrl}/${doc.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

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
    ...creatorUrls,
  ];
}
