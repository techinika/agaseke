export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/lib/baseUrl";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import ArticleSchema from "@/components/seo/ArticleSchema";
import {
  getCreatorForPost,
  getMoreCreatorPosts,
  serializeReaderArticle,
  serializeReaderCreator,
} from "@/lib/articleReader";

async function getArticle(slug: string) {
  try {
    const snap = await adminDb
      .collection("creatorContent")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch {
    return null;
  }
}

const stripHtml = (html: string = "") =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article: any = await getArticle(slug);

  if (!article || article.type !== "article" || article.status === "draft") {
    return { title: "Article Not Found | Agaseke", robots: { index: false } };
  }

  if (article.isPrivate === true) {
    const defaultImage = `${baseUrl}/agaseke.png`;
    const title = "Supporters-only article | Agaseke";
    const description =
      "This article is available to supporters of its creator on Agaseke.";
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
        siteName: "Agaseke",
        locale: "en_RW",
        type: "article",
        images: [{ url: defaultImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [defaultImage],
      },
    };
  }

  const { creator, handle: creatorHandle } = await getCreatorForPost(article);
  const displayName = (creator as any)?.name || creatorHandle || "Creator";
  const title = article.title || "Untitled Article";
  const description =
    article.shortDescription ||
    article.description ||
    stripHtml(article.htmlContent).slice(0, 160) ||
    `Read "${title}" by ${displayName} on Agaseke.`;
  const image =
    article.coverUrl || article.contentUrl || `${baseUrl}/agaseke.png`;
  const publishedTime =
    article.createdAt?.toDate?.()?.toISOString?.() || undefined;
  const modifiedTime =
    article.updatedAt?.toDate?.()?.toISOString?.() || publishedTime;

  return {
    title: `${title} | ${displayName} | Agaseke`,
    description,
    alternates: { canonical: `/articles/${slug}` },
    keywords: [
      displayName,
      creatorHandle,
      title,
      "Agaseke article",
      "African creator content",
    ].filter(Boolean),
    authors: creatorHandle
      ? [{ name: displayName, url: `${baseUrl}/${creatorHandle}` }]
      : [{ name: displayName }],
    openGraph: {
      title: `${title} | ${displayName}`,
      description,
      url: `${baseUrl}/articles/${slug}`,
      siteName: "Agaseke",
      locale: "en_RW",
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      authors: creatorHandle ? [`${baseUrl}/${creatorHandle}`] : [],
      ...(publishedTime
        ? {
            article: {
              publishedTime,
              ...(modifiedTime ? { modifiedTime } : {}),
              authors: creatorHandle ? [`${baseUrl}/${creatorHandle}`] : [],
            },
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${displayName}`,
      description,
      images: [image],
      site: "@Agaseke_support",
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

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article: any = await getArticle(slug);

  if (!article || article.type !== "article" || article.status === "draft") {
    notFound();
  }

  const { creator, handle: creatorHandle } = await getCreatorForPost(article);
  const serialized = serializeReaderArticle(article);
  const serializedCreator = serializeReaderCreator(creator, creatorHandle);
  const moreContent = creatorHandle
    ? await getMoreCreatorPosts(creatorHandle, serialized.id)
    : [];

  return (
    <>
      {!article.isPrivate && (
        <ArticleSchema
          headline={serialized.title}
          description={
            serialized.shortDescription ||
            stripHtml(article.htmlContent as string).slice(0, 160)
          }
          image={serialized.coverUrl || `${baseUrl}/agaseke.png`}
          url={`/articles/${slug}`}
          authorName={serializedCreator.name}
          authorUrl={creatorHandle ? `/${creatorHandle}` : undefined}
          publishedTime={serialized.createdAt || undefined}
          modifiedTime={
            article.updatedAt?.toDate?.()?.toISOString?.() as string | undefined
          }
        />
      )}
      <ArticleReaderPage
        article={serialized}
        creator={serializedCreator}
        moreContent={moreContent}
      />
    </>
  );
}