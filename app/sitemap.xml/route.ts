import { generateSitemaps } from "../sitemap";

export async function GET() {
  const sitemaps = await generateSitemaps();

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${sitemaps
      .map(
        (sitemap) =>
          `<sitemap><loc>${process.env.NEXT_PUBLIC_BASE_URL}/sitemap-${sitemap.id}.xml</loc></sitemap>`
      )
      .join("")}
  </sitemapindex>`;

  return new Response(sitemapIndex, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
