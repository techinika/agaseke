export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { baseUrl } from "@/lib/baseUrl";
import PostDetailPage from "@/components/pages/public/PostDetailPage";
import ArticleReaderPage from "@/components/pages/public/ArticleReaderPage";
import ArticleSchema from "@/components/seo/ArticleSchema";
import PostSchema from "@/components/seo/PostSchema";
import {
  getCreatorByHandle,
  getMoreCreatorPosts,
  getPostById,
  serializeReaderArticle,
  serializeReaderCreator,
  serializeReaderPost,
} from "@/lib/articleReader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}): Promise<Metadata> {
  const { username, postId } = await params;
  const [creator, post] = await Promise.all([
    getCreatorByHandle(username),
    getPostById(postId),
  ]);

  if (!creator || !post) {
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

  const displayName = (creator as any).name || username;
  const title = (post as any).title || `Post by ${displayName}`;
  const description =
    ((post as any).shortDescription ||
      (post as any).description ||
      (post as any).content ||
      "")?.slice(0, 180) ||
    `View "${title}" by ${displayName} on Agaseke.`;
  const canonical =
    (post as any).type === "article" && (post as any).slug
      ? `/articles/${(post as any).slug}`
      : `/${username}/community/${postId}`;
  const image =
    (typeof (post as any).coverUrl === "string" && (post as any).coverUrl) ||
    (typeof (post as any).contentUrl === "string" && (post as any).contentUrl) ||
    (creator as any).profilePicture ||
    `${baseUrl}/agaseke.png`;
  const publishedTime =
    (post as any).createdAt?.toDate?.()?.toISOString?.() || undefined;

  return {
    title: `${title} · ${displayName} | Agaseke`,
    description,
    alternates: { canonical },
    keywords: [displayName, username, title, "community post", "Agaseke"],
    authors: [{ name: displayName, url: `${baseUrl}/${username}` }],
    openGraph: {
      title: `${title} · ${displayName}`,
      description,
      url: `${baseUrl}${canonical}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
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
      title: `${title} · ${displayName}`,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default async function CreatorPostPage({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}) {
  const { username, postId } = await params;
  const [creator, post, moreContent] = await Promise.all([
    getCreatorByHandle(username),
    getPostById(postId),
    getMoreCreatorPosts(username, postId),
  ]);

  if (!post) {
    notFound();
  }

  const displayName = (creator as any)?.name || username;
  const title = (post as any)?.title || `Post by ${displayName}`;
  const isArticle = (post as any)?.type === "article" && (post as any)?.slug;
  const isPrivate = (post as any)?.isPrivate === true;
  const publishedTime = (post as any)?.createdAt
    ?.toDate?.()
    ?.toISOString?.() as string | undefined;
  const canonical = isArticle
    ? `/articles/${(post as any)?.slug}`
    : `/${username}/community/${postId}`;

  const serializedCreator = serializeReaderCreator(creator, username);

  if (isArticle) {
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
              (creator as any)?.profilePicture ||
              `${baseUrl}/agaseke.png`
            }
            url={canonical}
            authorName={displayName}
            authorUrl={`/${username}`}
            publishedTime={publishedTime}
          />
        )}
        <ArticleReaderPage
          article={serializeReaderArticle(post)}
          creator={serializedCreator}
          moreContent={moreContent}
          backHref={`/${username}`}
          backLabel={`Back to ${displayName}`}
        />
      </>
    );
  }

  const serializedPost = serializeReaderPost(post);

  return (
    <>
      {!isPrivate && (
        <PostSchema
          headline={title}
          description={
            serializedPost.description ||
            serializedPost.content ||
            `View "${title}" by ${displayName} on Agaseke.`
          }
          image={
            typeof serializedPost.contentUrl === "string"
              ? serializedPost.contentUrl
              : serializedCreator.photoURL || `${baseUrl}/agaseke.png`
          }
          url={canonical}
          authorName={displayName}
          authorUrl={`/${username}`}
          publishedTime={publishedTime}
          views={serializedPost.views}
          commentCount={serializedPost.commentCount}
          breadcrumbs={[
            { name: "Home", url: "/" },
            { name: displayName, url: `/${username}` },
            { name: "Community", url: `/${username}?tab=community` },
            { name: title, url: canonical },
          ]}
        />
      )}
      <PostDetailPage
        username={username}
        postId={postId}
        initialPost={serializedPost}
        initialCreator={serializedCreator}
        initialMoreContent={moreContent}
        backHref={`/${username}`}
        backLabel={`Back to ${displayName}`}
      />
    </>
  );
}
