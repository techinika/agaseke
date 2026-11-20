export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/lib/baseUrl";
import ExplorePostDetailPage from "@/components/pages/ExplorePostDetailPage";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import ArticleSchema from "@/components/seo/ArticleSchema";
import PostSchema from "@/components/seo/PostSchema";
import {
  getCreatorForPost,
  getMoreCreatorPosts,
  getPostById,
  serializeReaderArticle,
  serializeReaderCreator,
  serializeReaderPost,
} from "@/lib/articleReader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "post-id": string }>;
}): Promise<Metadata> {
  const { "post-id": postId } = await params;
  const post = await getPostById(postId);

  if (!post) {
    return { title: "Post Not Found | Agaseke", robots: { index: false } };
  }

  if ((post as any).isPrivate === true) {
    const defaultImage = `${baseUrl}/agaseke.png`;
    const title = "Supporters-only post | Agaseke";
    const description =
      "This post is available to supporters of its creator on Agaseke.";
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

  const { creator, handle: creatorHandle } = await getCreatorForPost(post);
  const displayName = (creator as any)?.name || creatorHandle || "Creator";
  const title = (post as any).title || `Post by ${displayName}`;
  const rawDesc =
    (post as any).shortDescription ||
    (post as any).description ||
    (post as any).content ||
    "";
  const description =
    rawDesc.slice(0, 180) || `View "${title}" by ${displayName} on Agaseke.`;
  const image =
    (typeof (post as any).coverUrl === "string" && (post as any).coverUrl) ||
    (typeof (post as any).contentUrl === "string" && (post as any).contentUrl) ||
    (creator as any)?.profilePicture ||
    `${baseUrl}/agaseke.png`;
  const canonical =
    (post as any).type === "article" && (post as any).slug
      ? `/articles/${(post as any).slug}`
      : creatorHandle
        ? `/${creatorHandle}/community/${postId}`
        : `/explore/posts/${postId}`;

  return {
    title: `${title} by ${displayName} | Agaseke`,
    description,
    keywords: [
      displayName,
      creatorHandle,
      title,
      "Agaseke post",
      "African creator content",
    ].filter(Boolean),
    alternates: { canonical },
    openGraph: {
      title: `${title} · ${displayName}`,
      description,
      url: `${baseUrl}${canonical}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: "article",
      locale: "en_RW",
      ...(creatorHandle && {
        article: {
          authors: [`${baseUrl}/${creatorHandle}`],
        },
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${displayName}`,
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
  params: Promise<{ "post-id": string }>;
}) {
  const { "post-id": postId } = await params;
  const post = await getPostById(postId);

  if (!post) {
    notFound();
  }

  const isPrivate = (post as any)?.isPrivate === true;
  const isArticle = (post as any)?.type === "article" && (post as any)?.slug;
  const { creator, handle: creatorHandle } = await getCreatorForPost(post);
  const displayName = (creator as any)?.name || creatorHandle || "Creator";
  const serializedCreator = serializeReaderCreator(creator, creatorHandle);
  const moreContent = creatorHandle
    ? await getMoreCreatorPosts(creatorHandle, postId)
    : [];

  if (isArticle) {
    const title = (post as any)?.title || "Untitled";
    const article = serializeReaderArticle(post);
    const publishedTime = (post as any)?.createdAt
      ?.toDate?.()
      ?.toISOString?.() as string | undefined;

    return (
      <>
        {!isPrivate && (
          <ArticleSchema
            headline={title}
            description={
              (post as any)?.shortDescription ||
              `Read "${title}" by ${displayName} on Agaseke.`
            }
            image={
              (post as any)?.coverUrl ||
              (post as any)?.contentUrl ||
              `${baseUrl}/agaseke.png`
            }
            url={`/articles/${(post as any)?.slug}`}
            authorName={displayName}
            authorUrl={creatorHandle ? `/${creatorHandle}` : undefined}
            publishedTime={publishedTime}
          />
        )}
        <ArticleReaderPage
          article={article}
          creator={serializedCreator}
          moreContent={moreContent}
        />
      </>
    );
  }

  const serializedPost = serializeReaderPost(post);
  const publishedTime = (post as any)?.createdAt
    ?.toDate?.()
    ?.toISOString?.() as string | undefined;
  const canonicalUrl = creatorHandle
    ? `/${creatorHandle}/community/${postId}`
    : `/explore/posts/${postId}`;

  return (
    <>
      {!isPrivate && (
        <PostSchema
          headline={serializedPost.title || `Post by ${displayName}`}
          description={
            serializedPost.description ||
            serializedPost.content ||
            `View post by ${displayName} on Agaseke.`
          }
          image={
            typeof serializedPost.contentUrl === "string"
              ? serializedPost.contentUrl
              : serializedCreator.photoURL || `${baseUrl}/agaseke.png`
          }
          url={canonicalUrl}
          authorName={displayName}
          authorUrl={creatorHandle ? `/${creatorHandle}` : undefined}
          publishedTime={publishedTime}
          views={serializedPost.views}
          commentCount={serializedPost.commentCount}
          breadcrumbs={[
            { name: "Home", url: "/" },
            { name: "Posts", url: "/explore/posts" },
            {
              name: serializedPost.title || `Post by ${displayName}`,
              url: canonicalUrl,
            },
          ]}
        />
      )}
      <ExplorePostDetailPage
        postId={postId}
        username={creatorHandle || undefined}
        initialPost={serializedPost}
        initialCreator={serializedCreator}
        initialMoreContent={moreContent}
      />
    </>
  );
}
