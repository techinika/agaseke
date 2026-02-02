import { MetadataRoute } from "next";
import { baseUrl } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/onboarding",
        "/api",
        "/admin",
        "/creator",
        "/supporter",
        "/profile",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
