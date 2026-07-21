export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import { Metadata } from "next";
import { baseUrl } from "@/lib/baseUrl";
import ExplorePostDetailPage from "@/components/pages/ExplorePostDetailPage";

async function getPost(postId: string) {
  try {
    const snap = await adminDb.collection("creatorContent").doc(postId).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    return { id: snap.id, ...data };
  } catch {
    return null;
  }
}

async function getCreatorByHandle(handle: string) {
  try {
    const snap = await adminDb.collection("creators").doc(handle).get();
    return snap.exists ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "post-id": string }>;
}): Promise<Metadata> {
  const { "post-id": postId } = await params;
  const post = await getPost(postId);

  if (!post) {
    return { title: "Post Not Found | Agaseke", robots: { index: false } };
  }

  const creatorHandle = (post as any).creatorId || "";
  const creatorUid = (post as any).creatorUid || "";
  const creator = creatorHandle ? await getCreatorByHandle(creatorHandle) : null;

  const displayName = (creator as any)?.name || creatorHandle || "Creator";
  const title = (post as any).title || "Untitled Post";
  const description = ((post as any).description || (post as any).content || "").slice(0, 200);
  const image = (post as any).contentUrl || `${baseUrl}/agaseke.png`;

  return {
    title: `${title} by ${displayName} | Agaseke Posts`,
    description: description || `View "${title}" by ${displayName} on Agaseke.`,
    keywords: [
      displayName,
      creatorHandle,
      title,
      "Agaseke post",
      "African creator content",
      "public post",
    ],
    alternates: {
      canonical: `/explore/posts/${postId}`,
    },
    openGraph: {
      title: `${title} | ${displayName}`,
      description: description || `View this post by ${displayName}.`,
      url: `${baseUrl}/explore/posts/${postId}`,
      siteName: "Agaseke",
      images: [{ url: image, width: 800, height: 800, alt: title }],
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
      title: `${title} | ${displayName}`,
      description: description || `View this post by ${displayName}.`,
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
  return <ExplorePostDetailPage postId={postId} />;
}
