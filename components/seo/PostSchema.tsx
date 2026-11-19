import { getBreadcrumbSchema, getPostSchema } from "@/lib/schemas";

interface PostSchemaProps {
  headline: string;
  description: string;
  image?: string;
  url: string;
  authorName: string;
  authorUrl?: string;
  publishedTime?: string;
  modifiedTime?: string;
  views?: number;
  commentCount?: number;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export default function PostSchema({
  breadcrumbs,
  ...props
}: PostSchemaProps) {
  const postJsonLd = getPostSchema(props);
  const breadcrumbJsonLd = breadcrumbs?.length
    ? getBreadcrumbSchema(breadcrumbs)
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }}
      />
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
    </>
  );
}
