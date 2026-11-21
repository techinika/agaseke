/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import ArticleSchema from "@/components/seo/ArticleSchema";
import { baseUrl } from "@/lib/baseUrl";
import { isGatedVisibility } from "@/lib/contentAccess";
import {
  getArticleBySlug,
  getCreatorForPost,
  getMoreCreatorPosts,
  serializeReaderArticle,
  serializeReaderCreator,
} from "@/lib/articleReader";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | Agaseke",
      robots: { index: false, follow: false },
    };
  }

  if (isGatedVisibility(post)) {
    const defaultImage = `${baseUrl}/agaseke.png`;
    const title = "Protected Article | Agaseke";
    const description =
      "Unlock this article from its creator on Agaseke.";
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        siteName: "Agaseke",
        images: [{ url: defaultImage, width: 1200, height: 630 }],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [defaultImage],
      },
    };
  }

  const { creator, handle } = await getCreatorForPost(post);
  const creatorName = (creator as any)?.name || handle || "Creator";
  const rawTitle = String((post as any).title || "Article").trim();
  const title = `${rawTitle} — ${creatorName} | Agaseke`;
  const rawDesc = String(
    (post as any).shortDescription || (post as any).description || "",
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    rawDesc.slice(0, 160) || `Read "${rawTitle}" by ${creatorName} on Agaseke.`;
  const coverUrl = String(
    (post as any).coverUrl || (post as any).contentUrl || `${baseUrl}/agaseke.png`,
  );
  const canonicalPath = `/articles/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${canonicalPath}`,
      siteName: "Agaseke",
      images: [{ url: coverUrl, width: 1200, height: 630, alt: rawTitle }],
      locale: "en_RW",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function ArticleSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getArticleBySlug(slug);

  if (!post) {
    notFound();
  }

  const { creator, handle } = await getCreatorForPost(post);
  const moreContent = await getMoreCreatorPosts(handle, post.id, 3);

  const article = serializeReaderArticle(post);
  const readerCreator = serializeReaderCreator(creator, handle);

  const publishedIso =
    (post as any).publishedAt?.toDate?.()?.toISOString?.() ??
    article.createdAt ??
    undefined;
  const modifiedIso =
    (post as any).updatedAt?.toDate?.()?.toISOString?.() ?? publishedIso;

  return (
    <>
      {!article.isPrivate && (
        <ArticleSchema
          headline={article.title}
          description={
            article.shortDescription ||
            `Read "${article.title}" by ${readerCreator.name} on Agaseke.`
          }
          image={article.coverUrl || `${baseUrl}/agaseke.png`}
          url={`/articles/${article.slug || slug}`}
          authorName={readerCreator.name}
          authorUrl={readerCreator.handle ? `/${readerCreator.handle}` : undefined}
          publishedTime={publishedIso}
          modifiedTime={modifiedIso}
        />
      )}
      <ArticleReaderPage
        article={article}
        creator={readerCreator}
        moreContent={moreContent}
        backHref="/articles"
        backLabel="Back to Articles"
      />
    </>
  );
}
