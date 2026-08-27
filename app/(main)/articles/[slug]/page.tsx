export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/lib/baseUrl";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";

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

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
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

  if (!article || article.type !== "article") {
    return { title: "Article Not Found | Agaseke", robots: { index: false } };
  }

  const creatorHandle = article.creatorId || "";
  const creator = creatorHandle
    ? await getCreatorData(creatorHandle)
    : null;
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
      ...(description ? [description.slice(0, 60)] : []),
    ],
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

  if (!article || article.type !== "article") {
    notFound();
  }

  const creatorHandle = article.creatorId || "";
  const creator = creatorHandle ? await getCreatorData(creatorHandle) : null;

  const serialized = {
    id: article.id as string,
    title: (article.title as string) || "Untitled",
    shortDescription: (article.shortDescription ||
      article.description ||
      "") as string,
    htmlContent: (article.htmlContent as string) || "",
    coverUrl: (article.coverUrl || article.contentUrl || "") as string,
    slug: slug as string,
    isPrivate: !!article.isPrivate,
    commentCount: (article.commentCount as number) || 0,
    views: (article.views as number) || 0,
    createdAt: (article.createdAt?.toDate?.()?.toISOString?.() as string) || null,
  };

  const serializedCreator = {
    name: (creator as any)?.name || creatorHandle,
    handle: creatorHandle,
    uid: (creator as any)?.uid || "",
    photoURL: (creator as any)?.profilePicture || null,
    bio: (creator as any)?.bio || "",
  };

  return (
    <ArticleReaderPage
      article={serialized}
      creator={serializedCreator}
    />
  );
}