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

export interface ReaderCreator {
  name: string;
  handle: string;
  uid: string;
  photoURL: string | null;
  bio: string;
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

export async function getCreatorByHandle(handle: string) {
  try {
    const snap = await adminDb.collection("creators").doc(handle).get();
    return snap.exists ? snap.data() : null;
  } catch {
    return null;
  }
}

export function serializeReaderArticle(post: any): ReaderArticle {
  return {
    id: (post.id as string) || "",
    title: (post.title as string) || "Untitled",
    shortDescription: (post.shortDescription || post.description || "") as string,
    htmlContent: (post.htmlContent as string) || "",
    coverUrl: (post.coverUrl || post.contentUrl || "") as string,
    slug: (post.slug as string) || "",
    isPrivate: !!post.isPrivate,
    commentCount: (post.commentCount as number) || 0,
    views: (post.views as number) || 0,
    createdAt: post.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

export function serializeReaderCreator(creator: any, handle: string): ReaderCreator {
  return {
    name: creator?.name || handle,
    handle,
    uid: creator?.uid || "",
    photoURL: creator?.profilePicture || null,
    bio: creator?.bio || "",
  };
}