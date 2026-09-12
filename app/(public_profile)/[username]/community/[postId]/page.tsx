export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/lib/baseUrl";
import PostDetailPage from "@/components/pages/public/PostDetailPage";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import ArticleSchema from "@/components/seo/ArticleSchema";
import {
  serializeReaderArticle,
  serializeReaderCreator,
} from "@/lib/articleReader";

async function getCreatorData(username: string) {
  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

async function getPost(postId: string) {
  try {
    const snap = await adminDb.collection("creatorContent").doc(postId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}): Promise<Metadata> {
  const { username, postId } = await params;
  const [creator, post] = await Promise.all([getCreatorData(username), getPost(postId)]);

  if (!creator || !post || (post as any).status === "draft") {
    return { title: "Post | Not Found | Agaseke", robots: { index: false } };
  }

  const displayName = creator.name || username;
  const title = (post as any).title || "Post";
  const description =
    (post as any).shortDescription ||
    `View "${title}" by ${displayName} on Agaseke.`;
  const canonical =
    (post as any).type === "article" && (post as any).slug
      ? `/articles/${(post as any).slug}`
      : `/${username}/community/${postId}`;
  const image = (post as any).contentUrl || creator.profilePicture || `${baseUrl}/agaseke.png`;
  const publishedTime =
    (post as any).createdAt?.toDate?.()?.toISOString?.() || undefined;

  return {
    title: `${title} | ${displayName} Community | Agaseke`,
    description,
    alternates: { canonical },
    keywords: [
      displayName,
      username,
      title,
      "community post",
      "Agaseke",
    ],
    authors: [{ name: displayName, url: `${baseUrl}/${username}` }],
    openGraph: {
      title: `${title} | ${displayName}`,
      description,
      url: `${baseUrl}${canonical}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 800, height: 800, alt: title }],
      type: "article",
      ...(publishedTime
        ? {
            article: {
              publishedTime,
              authors: creator?.uid ? [`${baseUrl}/${username}`] : [],
            },
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${displayName}`,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

async function page({ params }: { params: Promise<{ username: string; postId: string }> }) {
  const { username, postId } = await params;
  const [creator, post] = await Promise.all([getCreatorData(username), getPost(postId)]);
  const displayName = creator?.name || username;
  const title = (post as any)?.title || "Post";

  if ((post as any)?.status === "draft") {
    notFound();
  }

  const isArticle = (post as any)?.type === "article" && (post as any)?.slug;
  const publishedTime =
    (post as any)?.createdAt?.toDate?.()?.toISOString?.() as string | undefined;
  const canonical = isArticle
    ? `/articles/${(post as any)?.slug}`
    : `/${username}/community/${postId}`;

  const articleSchema = (
    <ArticleSchema
      headline={title}
      description={(post as any)?.shortDescription || `View "${title}" by ${displayName} on Agaseke.`}
      image={(post as any)?.contentUrl || creator?.profilePicture || `${baseUrl}/agaseke.png`}
      url={canonical}
      authorName={displayName}
      authorUrl={`/${username}`}
      publishedTime={publishedTime}
    />
  );

  if (isArticle) {
    return (
      <>
        {articleSchema}
        <ArticleReaderPage
          article={serializeReaderArticle(post)}
          creator={serializeReaderCreator(creator, username)}
        />
      </>
    );
  }

  return (
    <>
      {articleSchema}
      <PostDetailPage username={username} postId={postId} />
    </>
  );
}

export default page;
