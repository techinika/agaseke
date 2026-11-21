/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/db/firebaseAdmin";
import {
  formatVisibilityLabel,
  isGatedVisibility,
  resolvePostVisibility,
  type PostVisibility,
} from "@/lib/contentAccess";
import { estimateReadingMinutes } from "@/lib/readingTime";

export { estimateReadingMinutes };

export interface ReaderArticle {
  id: string;
  title: string;
  shortDescription: string;
  htmlContent: string;
  coverUrl: string;
  slug: string;
  isPrivate: boolean;
  visibility: PostVisibility;
  requiredTierIds: string[];
  requiredTierNames: string[];
  readingMinutes: number;
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
  visibility: PostVisibility;
  requiredTierIds: string[];
  requiredTierNames: string[];
  readingMinutes: number;
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
  readingMinutes?: number;
  createdAt: string | null;
  publishedAt?: string | null;
}

export interface PublicArticleListItem {
  id: string;
  title: string;
  shortDescription: string;
  coverUrl: string;
  slug: string;
  readingMinutes: number;
  views: number;
  commentCount: number;
  createdAt: string | null;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string | null;
  creatorVerified: boolean;
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

export async function getArticleBySlug(slug: string) {
  try {
    if (!slug) return null;
    const snap = await adminDb
      .collection("creatorContent")
      .where("slug", "==", slug)
      .limit(5)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      if (data.type === "article" && data.status !== "draft") {
        return { id: doc.id, ...data };
      }
    }
    return null;
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
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snap = await adminDb
        .collection("creatorContent")
        .where("creatorId", "==", creatorHandle)
        .where("isPrivate", "==", false)
        .orderBy("createdAt", "desc")
        .limit(maxItems + 3)
        .get();
      docs = snap.docs;
    } catch {
      const fallbackSnap = await adminDb
        .collection("creatorContent")
        .where("creatorId", "==", creatorHandle)
        .where("isPrivate", "==", false)
        .limit(20)
        .get();
      docs = [...fallbackSnap.docs].sort(
        (a, b) =>
          (b.data().createdAt?.toMillis?.() ?? 0) -
          (a.data().createdAt?.toMillis?.() ?? 0),
      );
    }

    return docs
      .filter(
        (doc) =>
          doc.id !== excludePostId &&
          doc.data().status !== "draft" &&
          !isGatedVisibility(doc.data()),
      )
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
          readingMinutes:
            d.type === "article"
              ? estimateReadingMinutes(
                  String(d.htmlContent || d.shortDescription || ""),
                )
              : undefined,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
          publishedAt: d.publishedAt?.toDate?.()?.toISOString?.() ?? null,
        };
      });
  } catch {
    return [];
  }
}

export async function getPublicArticles(
  limitCount = 40,
): Promise<PublicArticleListItem[]> {
  try {
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snap = await adminDb
        .collection("creatorContent")
        .where("type", "==", "article")
        .where("isPrivate", "==", false)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();
      docs = snap.docs;
    } catch {
      const fallback = await adminDb
        .collection("creatorContent")
        .where("type", "==", "article")
        .limit(limitCount * 2)
        .get();
      docs = [...fallback.docs].sort(
        (a, b) =>
          (b.data().createdAt?.toMillis?.() ?? 0) -
          (a.data().createdAt?.toMillis?.() ?? 0),
      );
    }

    const publicDocs = docs.filter((doc) => {
      const d = doc.data();
      return (
        d.status !== "draft" &&
        typeof d.slug === "string" &&
        Boolean(d.slug) &&
        !isGatedVisibility(d)
      );
    });

    const creatorCache = new Map<string, any>();
    const handlesToFetch = [
      ...new Set(
        publicDocs
          .map((d) => String(d.data().creatorId || ""))
          .filter(Boolean),
      ),
    ];

    await Promise.all(
      handlesToFetch.slice(0, 50).map(async (handle) => {
        const snap = await adminDb.collection("creators").doc(handle).get();
        if (snap.exists) {
          creatorCache.set(handle, { handle: snap.id, ...snap.data() });
        }
      }),
    );

    return publicDocs.slice(0, limitCount).map((doc) => {
      const d = doc.data() as any;
      const handle = String(d.creatorId || "");
      const creator = creatorCache.get(handle);
      const plainSummary = String(d.shortDescription || d.description || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        id: doc.id,
        title: (d.title as string) || "Untitled article",
        shortDescription: plainSummary.slice(0, 200),
        coverUrl:
          typeof d.coverUrl === "string"
            ? d.coverUrl
            : typeof d.contentUrl === "string"
              ? d.contentUrl
              : "",
        slug: String(d.slug),
        readingMinutes: estimateReadingMinutes(
          String(d.htmlContent || d.shortDescription || ""),
        ),
        views: typeof d.views === "number" ? d.views : 0,
        commentCount: typeof d.commentCount === "number" ? d.commentCount : 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
        creatorName: creator?.name || handle || "Creator",
        creatorHandle: creator?.handle || handle,
        creatorAvatar: creator?.profilePicture || creator?.photoURL || null,
        creatorVerified: Boolean(creator?.verified),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Serializes an article for SSR pages. For gated articles (`supporters`,
 * `members`, `tier`), protected body HTML, dek, and asset URLs are omitted from
 * public SSR payloads and only fetched client-side after entitlement check.
 */
export function serializeReaderArticle(post: any): ReaderArticle {
  const visibility = resolvePostVisibility(post);
  const isPrivate = visibility !== "public";
  const requiredTierIds = Array.isArray(post.requiredTierIds)
    ? post.requiredTierIds.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const requiredTierNames = Array.isArray(post.requiredTierNames)
    ? post.requiredTierNames.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const label = formatVisibilityLabel(visibility, requiredTierNames);

  return {
    id: (post.id as string) || "",
    title: isPrivate ? `${label} article` : (post.title as string) || "Untitled",
    shortDescription: isPrivate
      ? ""
      : ((post.shortDescription || post.description || "") as string),
    htmlContent: isPrivate ? "" : ((post.htmlContent as string) || ""),
    coverUrl: isPrivate ? "" : ((post.coverUrl || post.contentUrl || "") as string),
    slug: (post.slug as string) || "",
    isPrivate,
    visibility,
    requiredTierIds,
    requiredTierNames,
    readingMinutes: estimateReadingMinutes(
      String(post.htmlContent || post.shortDescription || post.description || ""),
    ),
    commentCount: (post.commentCount as number) || 0,
    views: (post.views as number) || 0,
    createdAt: post.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

/**
 * Serializes a post for SSR pages. For gated posts (`supporters`, `members`,
 * `tier`), protected body copy and asset URLs are omitted from public SSR
 * payloads so content only loads after entitlement verification.
 */
export function serializeReaderPost(post: any): ReaderPost {
  const visibility = resolvePostVisibility(post);
  const isPrivate = visibility !== "public";
  const requiredTierIds = Array.isArray(post.requiredTierIds)
    ? post.requiredTierIds.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const requiredTierNames = Array.isArray(post.requiredTierNames)
    ? post.requiredTierNames.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const label = formatVisibilityLabel(visibility, requiredTierNames);

  return {
    id: (post.id as string) || "",
    title: isPrivate ? `${label} post` : (post.title as string) || "",
    description: isPrivate ? "" : ((post.description as string) || ""),
    content: isPrivate ? "" : ((post.content as string) || ""),
    shortDescription: isPrivate ? "" : ((post.shortDescription as string) || ""),
    htmlContent: isPrivate ? "" : ((post.htmlContent as string) || ""),
    type: (post.type as string) || "post",
    coverUrl: isPrivate ? "" : ((post.coverUrl as string) || ""),
    contentUrl: isPrivate ? null : (post.contentUrl ?? null),
    slug: (post.slug as string) || "",
    isPrivate,
    visibility,
    requiredTierIds,
    requiredTierNames,
    readingMinutes: estimateReadingMinutes(
      String(post.htmlContent || post.content || post.description || ""),
    ),
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