import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";

export const dynamic = "force-dynamic";

interface CachedCreatorSummary {
  handle: string;
  uid?: string;
  name: string;
  bio: string;
  focus: string[];
  profilePicture: string | null;
  photoURL: string | null;
  verified: boolean;
}

const CREATOR_CACHE_TTL_MS = 60_000;
let creatorCache: {
  expiresAt: number;
  list: CachedCreatorSummary[];
  byKey: Map<string, CachedCreatorSummary>;
} | null = null;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const fn = (value as { toDate?: () => Date }).toDate;
    if (typeof fn === "function") return fn().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

async function getCreatorDirectory(): Promise<{
  list: CachedCreatorSummary[];
  byKey: Map<string, CachedCreatorSummary>;
}> {
  const now = Date.now();
  if (creatorCache && creatorCache.expiresAt > now) {
    return creatorCache;
  }

  const snap = await adminDb
    .collection("creators")
    .select("name", "uid", "bio", "focus", "profilePicture", "photoURL", "verified")
    .orderBy("name")
    .get();

  const list: CachedCreatorSummary[] = [];
  const byKey = new Map<string, CachedCreatorSummary>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const summary: CachedCreatorSummary = {
      handle: doc.id,
      uid: typeof data.uid === "string" ? data.uid : undefined,
      name: typeof data.name === "string" && data.name.trim() ? data.name : doc.id,
      bio: typeof data.bio === "string" ? data.bio : "",
      focus: Array.isArray(data.focus)
        ? data.focus.filter((item): item is string => typeof item === "string")
        : [],
      profilePicture:
        typeof data.profilePicture === "string" ? data.profilePicture : null,
      photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
      verified: data.verified === true,
    };
    list.push(summary);
    byKey.set(doc.id, summary);
    if (summary.uid) byKey.set(summary.uid, summary);
  }

  creatorCache = {
    expiresAt: now + CREATOR_CACHE_TTL_MS,
    list,
    byKey,
  };

  return creatorCache;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind") === "posts" ? "posts" : "creators";
  const q = (params.get("q") || "").trim().toLowerCase();
  const offset = Math.max(0, Number.parseInt(params.get("offset") || "0", 10) || 0);
  const limitCount = Math.min(
    24,
    Math.max(1, Number.parseInt(params.get("limit") || "12", 10) || 12),
  );

  try {
    const { list, byKey } = await getCreatorDirectory();

    if (kind === "creators") {
      const matched = q
        ? list.filter(
            (creator) =>
              creator.handle.toLowerCase().includes(q) ||
              creator.name.toLowerCase().includes(q) ||
              creator.bio.toLowerCase().includes(q) ||
              creator.focus.some((topic) => topic.toLowerCase().includes(q)),
          )
        : list;

      const items = matched.slice(offset, offset + limitCount);
      const hasMore = offset + items.length < matched.length;

      return NextResponse.json(
        { items, hasMore, total: matched.length },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    const typeFilter = params.get("type") || "all";
    const postsQuery = adminDb
      .collection("creatorContent")
      .where("isPrivate", "==", false)
      .orderBy("createdAt", "desc");

    if (!q && typeFilter === "all") {
      const pageSnap = await postsQuery
        .offset(offset)
        .limit(limitCount + 5)
        .get();

      const published = pageSnap.docs
        .filter((doc) => doc.data().status !== "draft")
        .slice(0, limitCount)
        .map((doc) => {
          const data = doc.data();
          const creatorKey = String(data.creatorId || data.creatorUid || "");
          const author =
            byKey.get(creatorKey) ||
            byKey.get(String(data.creatorUid || "")) ||
            byKey.get(String(data.creatorId || ""));

          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            shortDescription: data.shortDescription || "",
            content: data.content || "",
            type: data.type || "text",
            slug: data.slug || "",
            coverUrl: data.coverUrl || "",
            contentUrl: data.contentUrl || null,
            views: typeof data.views === "number" ? data.views : 0,
            commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
            likesCount:
              typeof data.stats?.likes === "number"
                ? data.stats.likes
                : typeof data.likesCount === "number"
                  ? data.likesCount
                  : 0,
            createdAt: toIso(data.createdAt),
            publishedAt: toIso(data.publishedAt),
            authorName: author?.name || creatorKey.slice(0, 8) || "Creator",
            authorHandle: author?.handle || creatorKey,
            authorPhoto: author?.profilePicture || author?.photoURL || null,
          };
        });

      const hasMore = pageSnap.docs.length > published.length && published.length === limitCount;
      return NextResponse.json(
        { items: published, hasMore },
        {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          },
        },
      );
    }

    // Search or filtered query across recent public posts (bounded window)
    const searchSnap = await postsQuery.limit(120).get();
    const filtered = searchSnap.docs
      .filter((doc) => {
        const data = doc.data();
        if (data.status === "draft") return false;
        if (typeFilter === "articles" && data.type !== "article") return false;
        if (typeFilter === "posts" && data.type === "article") return false;
        if (!q) return true;

        const creatorKey = String(data.creatorId || data.creatorUid || "");
        const author =
          byKey.get(creatorKey) ||
          byKey.get(String(data.creatorUid || "")) ||
          byKey.get(String(data.creatorId || ""));

        return (
          String(data.title || "")
            .toLowerCase()
            .includes(q) ||
          String(data.description || "")
            .toLowerCase()
            .includes(q) ||
          String(data.shortDescription || "")
            .toLowerCase()
            .includes(q) ||
          String(author?.name || "")
            .toLowerCase()
            .includes(q) ||
          String(author?.handle || creatorKey)
            .toLowerCase()
            .includes(q)
        );
      })
      .map((doc) => {
        const data = doc.data();
        const creatorKey = String(data.creatorId || data.creatorUid || "");
        const author =
          byKey.get(creatorKey) ||
          byKey.get(String(data.creatorUid || "")) ||
          byKey.get(String(data.creatorId || ""));

        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          shortDescription: data.shortDescription || "",
          content: data.content || "",
          type: data.type || "text",
          slug: data.slug || "",
          coverUrl: data.coverUrl || "",
          contentUrl: data.contentUrl || null,
          views: typeof data.views === "number" ? data.views : 0,
          commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
          likesCount:
            typeof data.stats?.likes === "number"
              ? data.stats.likes
              : typeof data.likesCount === "number"
                ? data.likesCount
                : 0,
          createdAt: toIso(data.createdAt),
          publishedAt: toIso(data.publishedAt),
          authorName: author?.name || creatorKey.slice(0, 8) || "Creator",
          authorHandle: author?.handle || creatorKey,
          authorPhoto: author?.profilePicture || author?.photoURL || null,
        };
      });

    const items = filtered.slice(offset, offset + limitCount);
    const hasMore = offset + items.length < filtered.length;

    return NextResponse.json(
      { items, hasMore, total: filtered.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Explore API error:", error);
    return NextResponse.json(
      { items: [], hasMore: false, error: "Failed to load directory" },
      { status: 500 },
    );
  }
}
