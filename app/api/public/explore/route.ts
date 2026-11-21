import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { isGatedVisibility, resolvePostVisibility } from "@/lib/contentAccess";
import { estimateReadingMinutes } from "@/lib/readingTime";

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

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const secs = (value as { seconds?: number }).seconds;
    if (typeof secs === "number") return secs * 1000;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function stripHtml(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function matchesQuery(haystack: string, q: string): boolean {
  if (!q) return true;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const normalized = haystack.toLowerCase();
  return terms.every((term) => normalized.includes(term));
}

async function getCreatorDirectory(): Promise<{
  list: CachedCreatorSummary[];
  byKey: Map<string, CachedCreatorSummary>;
}> {
  const now = Date.now();
  if (creatorCache && creatorCache.expiresAt > now) {
    return creatorCache;
  }

  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  try {
    const snap = await adminDb
      .collection("creators")
      .select("name", "uid", "bio", "focus", "profilePicture", "photoURL", "verified")
      .orderBy("name")
      .get();
    docs = snap.docs;
  } catch {
    const snap = await adminDb
      .collection("creators")
      .select("name", "uid", "bio", "focus", "profilePicture", "photoURL", "verified")
      .get();
    docs = [...snap.docs].sort((a, b) =>
      String(a.data().name || a.id).localeCompare(String(b.data().name || b.id)),
    );
  }

  const list: CachedCreatorSummary[] = [];
  const byKey = new Map<string, CachedCreatorSummary>();

  for (const doc of docs) {
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

async function fetchPublicPostDocs(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  try {
    const snap = await adminDb
      .collection("creatorContent")
      .where("isPrivate", "==", false)
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();
    return snap.docs;
  } catch {
    const fallbackSnap = await adminDb
      .collection("creatorContent")
      .where("isPrivate", "==", false)
      .limit(300)
      .get();
    return [...fallbackSnap.docs].sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      const bTime = toMillis(bData.publishedAt) || toMillis(bData.createdAt);
      const aTime = toMillis(aData.publishedAt) || toMillis(aData.createdAt);
      return bTime - aTime;
    });
  }
}

function serializeExplorePost(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  byKey: Map<string, CachedCreatorSummary>,
) {
  const data = doc.data();
  const creatorKey = String(data.creatorId || data.creatorUid || "");
  const author =
    byKey.get(creatorKey) ||
    byKey.get(String(data.creatorUid || "")) ||
    byKey.get(String(data.creatorId || ""));

  const type = String(data.type || "text");
  const readingMinutes =
    type === "article"
      ? estimateReadingMinutes(
          String(data.htmlContent || data.shortDescription || data.description || ""),
        )
      : undefined;

  return {
    id: doc.id,
    title: data.title || "",
    description: data.description || "",
    shortDescription: data.shortDescription || "",
    content: data.content || "",
    type,
    slug: data.slug || "",
    coverUrl: data.coverUrl || "",
    contentUrl: data.contentUrl || null,
    visibility: resolvePostVisibility(data),
    requiredTierNames: Array.isArray(data.requiredTierNames)
      ? data.requiredTierNames
      : [],
    readingMinutes,
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
    authorVerified: Boolean(author?.verified),
  };
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
        ? list.filter((creator) =>
            matchesQuery(
              [creator.handle, creator.name, creator.bio, ...creator.focus].join(" "),
              q,
            ),
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

    if (!q && typeFilter === "all") {
      try {
        const pageSnap = await adminDb
          .collection("creatorContent")
          .where("isPrivate", "==", false)
          .orderBy("createdAt", "desc")
          .offset(offset)
          .limit(limitCount + 5)
          .get();

        const publishedDocs = pageSnap.docs.filter((doc) => {
          const d = doc.data();
          return d.status !== "draft" && !isGatedVisibility(d);
        });

        const published = publishedDocs
          .slice(0, limitCount)
          .map((doc) => serializeExplorePost(doc, byKey));

        const hasMore =
          publishedDocs.length > limitCount ||
          (pageSnap.docs.length === limitCount + 5 && published.length === limitCount);

        return NextResponse.json(
          { items: published, hasMore },
          {
            headers: {
              "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            },
          },
        );
      } catch {
        // Composite index not available — fall through to bounded in-memory query
      }
    }

    const allDocs = await fetchPublicPostDocs();
    const filtered = allDocs
      .filter((doc) => {
        const data = doc.data();
        if (data.status === "draft") return false;
        if (isGatedVisibility(data)) return false;
        if (typeFilter === "articles" && data.type !== "article") return false;
        if (typeFilter === "posts" && data.type === "article") return false;
        if (!q) return true;

        const creatorKey = String(data.creatorId || data.creatorUid || "");
        const author =
          byKey.get(creatorKey) ||
          byKey.get(String(data.creatorUid || "")) ||
          byKey.get(String(data.creatorId || ""));

        const haystack = [
          data.title,
          data.description,
          data.shortDescription,
          stripHtml(data.content),
          stripHtml(data.htmlContent),
          data.slug,
          author?.name,
          author?.handle,
          creatorKey,
        ]
          .filter(Boolean)
          .join(" ");

        return matchesQuery(haystack, q);
      })
      .map((doc) => serializeExplorePost(doc, byKey));

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
