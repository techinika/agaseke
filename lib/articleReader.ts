/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";

export interface ReaderArticle {
  id: string;
  title: string;
  shortDescription: string;
  htmlContent: string;
  coverUrl: string;
  slug: string;
  isPrivate: boolean;
  commentCount: number;
  views: number;
  createdAt: string | null;
}

export interface ReaderPost {
  id: string;
  title: string;
  description: string;
  content: string;
  shortDescription: string;
  htmlContent: string;
  type: string;
  coverUrl: string;
  contentUrl: string | string[] | null;
  slug: string;
  isPrivate: boolean;
  creatorId: string;
  creatorUid: string;
  commentCount: number;
  views: number;
  likesCount: number;
  createdAt: string | null;
  publishedAt: string | null;
}

export interface ReaderCreator {
  name: string;
  handle: string;
  uid: string;
  photoURL: string | null;
  bio: string;
  verified?: boolean;
}

export interface MoreCreatorItem {
  id: string;
  title: string;
  coverUrl: string;
  type: string;
  slug: string;
  createdAt: string | null;
  publishedAt?: string | null;
}

export async function getArticlePost(postId: string) {
  try {
    const snap = await adminDb.collection("creatorContent").doc(postId).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    if (data.type !== "article" || !data.slug || data.status === "draft")
      return null;
    return { id: snap.id, ...data };
  } catch {
    return null;
  }
}

export async function getPostById(postId: string) {
  try {
    const snap = await adminDb.collection("creatorContent").doc(postId).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    if (data.status === "draft") return null;
    return { id: snap.id, ...data };
  } catch {
    return null;
  }
}

export async function getCreatorByHandle(handle: string) {
  try {
    if (!handle) return null;
    const snap = await adminDb.collection("creators").doc(handle).get();
    if (snap.exists) return snap.data();

    // Fallback when creatorId was stored as UID
    const byUid = await adminDb
      .collection("creators")
      .where("uid", "==", handle)
      .limit(1)
      .get();
    if (!byUid.empty) {
      return { handle: byUid.docs[0].id, ...byUid.docs[0].data() };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCreatorForPost(post: any): Promise<{
  creator: any;
  handle: string;
}> {
  const rawHandle = String(post?.creatorId || "");
  if (rawHandle) {
    const snap = await adminDb.collection("creators").doc(rawHandle).get();
    if (snap.exists) {
      return { creator: snap.data(), handle: snap.id };
    }
  }
  const uid = String(post?.creatorUid || rawHandle || "");
  if (uid) {
    const byUid = await adminDb
      .collection("creators")
      .where("uid", "==", uid)
      .limit(1)
      .get();
    if (!byUid.empty) {
      return { creator: byUid.docs[0].data(), handle: byUid.docs[0].id };
    }
  }
  return { creator: null, handle: rawHandle };
}

export async function getMoreCreatorPosts(
  creatorHandle: string,
  excludePostId: string,
  maxItems = 3,
): Promise<MoreCreatorItem[]> {
  if (!creatorHandle) return [];
  try {
    const snap = await adminDb
      .collection("creatorContent")
      .where("creatorId", "==", creatorHandle)
      .where("isPrivate", "==", false)
      .orderBy("createdAt", "desc")
      .limit(maxItems + 3)
      .get();

    return snap.docs
      .filter((doc) => doc.id !== excludePostId && doc.data().status !== "draft")
      .slice(0, maxItems)
      .map((doc) => {
        const d = doc.data() as any;
        const cover =
          typeof d.coverUrl === "string"
            ? d.coverUrl
            : typeof d.contentUrl === "string"
              ? d.contentUrl
              : Array.isArray(d.contentUrl)
                ? String(d.contentUrl[0] || "")
                : "";
        return {
          id: doc.id,
          title: (d.title as string) || "Untitled post",
          coverUrl: cover,
          type: (d.type as string) || "post",
          slug: (d.slug as string) || "",
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
          publishedAt: d.publishedAt?.toDate?.()?.toISOString?.() ?? null,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Serializes an article for SSR pages. For supporters-only (`isPrivate`) articles,
 * protected body HTML, dek, and asset URLs are omitted from public SSR payloads
 * and only fetched client-side after supporter entitlement verification.
 */
export function serializeReaderArticle(post: any): ReaderArticle {
  const isPrivate = !!post.isPrivate;
  return {
    id: (post.id as string) || "",
    title: isPrivate ? "Supporters-only article" : (post.title as string) || "Untitled",
    shortDescription: isPrivate
      ? ""
      : ((post.shortDescription || post.description || "") as string),
    htmlContent: isPrivate ? "" : ((post.htmlContent as string) || ""),
    coverUrl: isPrivate ? "" : ((post.coverUrl || post.contentUrl || "") as string),
    slug: (post.slug as string) || "",
    isPrivate,
    commentCount: (post.commentCount as number) || 0,
    views: (post.views as number) || 0,
    createdAt: post.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

/**
 * Serializes a post for SSR pages. For supporters-only (`isPrivate`) posts,
 * protected body copy and asset URLs are omitted from public SSR payloads so
 * content only loads after client-side supporter entitlement verification.
 */
export function serializeReaderPost(post: any): ReaderPost {
  const isPrivate = !!post.isPrivate;
  return {
    id: (post.id as string) || "",
    title: isPrivate ? "Supporters-only post" : (post.title as string) || "",
    description: isPrivate ? "" : ((post.description as string) || ""),
    content: isPrivate ? "" : ((post.content as string) || ""),
    shortDescription: isPrivate ? "" : ((post.shortDescription as string) || ""),
    htmlContent: isPrivate ? "" : ((post.htmlContent as string) || ""),
    type: (post.type as string) || "post",
    coverUrl: isPrivate ? "" : ((post.coverUrl as string) || ""),
    contentUrl: isPrivate ? null : (post.contentUrl ?? null),
    slug: (post.slug as string) || "",
    isPrivate,
    creatorId: (post.creatorId as string) || "",
    creatorUid: (post.creatorUid as string) || "",
    commentCount: (post.commentCount as number) || 0,
    views: (post.views as number) || 0,
    likesCount: (post.stats?.likes as number) || 0,
    createdAt: post.createdAt?.toDate?.()?.toISOString?.() ?? null,
    publishedAt: post.publishedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

export function serializeReaderCreator(creator: any, handle: string): ReaderCreator {
  return {
    name: creator?.name || handle,
    handle: creator?.handle || handle,
    uid: creator?.uid || "",
    photoURL: creator?.profilePicture || creator?.photoURL || null,
    bio: creator?.bio || "",
    verified: Boolean(creator?.verified),
  };
}