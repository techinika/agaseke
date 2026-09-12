import JsonLd from "@/components/seo/JsonLd";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/schemas";
import { baseUrl } from "@/lib/baseUrl";

interface ArticleSchemaProps {
  headline: string;
  description: string;
  image: string;
  url: string;
  authorName: string;
  authorUrl?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export default function ArticleSchema({
  headline,
  description,
  image,
  url,
  authorName,
  authorUrl,
  publishedTime,
  modifiedTime,
}: ArticleSchemaProps) {
  const article = getArticleSchema({
    headline,
    description,
    image,
    url: `${baseUrl}${url}`,
    authorName,
    authorUrl: authorUrl ? `${baseUrl}${authorUrl}` : undefined,
    publishedTime,
    modifiedTime,
  });

  const breadcrumbs = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Articles", url: "/explore/posts" },
    { name: headline, url },
  ]);

  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={breadcrumbs} />
    </>
  );
}