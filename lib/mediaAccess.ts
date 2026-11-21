import { adminDb } from "@/db/firebaseAdmin";
import {
  canViewerAccessPost,
  isGatedVisibility,
  isSubscriptionActive,
  resolvePostVisibility,
  type PostVisibility,
} from "@/lib/contentAccess";
import { isBareMediaKey } from "@/lib/mediaKey";

/**
 * Media URLs that belong to a post, in the order they appear in the document.
 * A post can carry a single `contentUrl`, an array of document pages, or an
 * array in `mediaUrls`, so every shape is flattened here.
 */
export function collectPostMediaUrls(data: Record<string, unknown>): string[] {
  const urls = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      urls.add(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.trim()) urls.add(entry.trim());
      }
    }
  };

  add(data.contentUrl);
  add(data.mediaUrls);
  add(data.coverUrl);
  add(data.thumbnailUrl);

  return [...urls];
}

export interface MediaAccess {
  allowed: boolean;
  isPrivate: boolean;
  visibility: PostVisibility;
  requiredTierIds: string[];
  requiredTierNames: string[];
  urls: string[];
  title: string;
  data: Record<string, unknown>;
}

/**
 * Decide whether `viewer` may load the content/media attached to a creator post.
 *
 * Public posts are readable by anyone. Gated posts (`supporters`, `members`,
 * `tier`) require the creator, an admin, an existing supporter relationship, or
 * an active community subscription matching the required tier(s).
 */
export async function checkPostMediaAccess(
  postId: string,
  viewer: { uid: string; isAdmin: boolean } | null,
): Promise<MediaAccess | null> {
  const snap = await adminDb.collection("creatorContent").doc(postId).get();
  if (!snap.exists) return null;

  const data = (snap.data() || {}) as Record<string, unknown>;
  const visibility = resolvePostVisibility(data);
  const isPrivate = isGatedVisibility(data);
  const requiredTierIds = Array.isArray(data.requiredTierIds)
    ? data.requiredTierIds.filter((t): t is string => typeof t === "string" && Boolean(t))
    : [];
  const requiredTierNames = Array.isArray(data.requiredTierNames)
    ? data.requiredTierNames.filter((t): t is string => typeof t === "string" && Boolean(t))
    : [];
  const urls = collectPostMediaUrls(data);
  const title = typeof data.title === "string" ? data.title : "";

  const base: Omit<MediaAccess, "allowed"> = {
    isPrivate,
    visibility,
    requiredTierIds,
    requiredTierNames,
    urls,
    title,
    data,
  };

  const isDraft = data.status === "draft";
  if (!isPrivate && !isDraft) return { ...base, allowed: true };
  if (!viewer) return { ...base, allowed: false };
  if (viewer.isAdmin) return { ...base, allowed: true };

  let creatorUid = typeof data.creatorUid === "string" ? data.creatorUid : "";
  const creatorId = typeof data.creatorId === "string" ? data.creatorId : "";
  let creatorHandle = typeof data.creatorHandle === "string" ? data.creatorHandle : "";

  if (creatorUid === viewer.uid || creatorId === viewer.uid) {
    return { ...base, allowed: true };
  }

  if (creatorId) {
    const creatorSnap = await adminDb.collection("creators").doc(creatorId).get();
    if (creatorSnap.exists) {
      const cData = creatorSnap.data() || {};
      if (cData.uid === viewer.uid) {
        return { ...base, allowed: true };
      }
      if (!creatorUid && typeof cData.uid === "string") creatorUid = cData.uid;
      if (!creatorHandle) creatorHandle = creatorSnap.id;
    }
  }

  // Drafts are strictly creator/admin only
  if (isDraft) {
    return { ...base, allowed: false };
  }

  const candidateCreatorIds = [
    creatorId,
    creatorHandle,
    creatorUid,
  ].filter(Boolean);

  if (candidateCreatorIds.length === 0) {
    return { ...base, allowed: false };
  }

  const candidateSet = new Set(candidateCreatorIds);

  // Query active community subscriptions for this viewer (single-field index on userId)
  const activeTierIds = new Set<string>();
  const subsSnap = await adminDb
    .collection("communitySubscriptions")
    .where("userId", "==", viewer.uid)
    .get();

  for (const subDoc of subsSnap.docs) {
    const sub = subDoc.data() as Record<string, unknown>;
    if (!isSubscriptionActive(sub)) continue;
    const matchesCreator =
      (typeof sub.creatorHandle === "string" && candidateSet.has(sub.creatorHandle)) ||
      (typeof sub.creatorId === "string" && candidateSet.has(sub.creatorId)) ||
      (typeof sub.creatorUid === "string" && candidateSet.has(sub.creatorUid));
    if (matchesCreator && typeof sub.tierId === "string" && sub.tierId) {
      activeTierIds.add(sub.tierId);
    }
  }

  let isSupporter = activeTierIds.size > 0;
  if (!isSupporter && visibility === "supporters") {
    const supportSnap = await adminDb
      .collection("supportedCreators")
      .where("supporterId", "==", viewer.uid)
      .where("creatorId", "in", [...candidateSet].slice(0, 10))
      .limit(1)
      .get();
    isSupporter = !supportSnap.empty;
  }

  const allowed = canViewerAccessPost({
    post: {
      isPrivate,
      visibility,
      requiredTierIds,
      requiredTierNames,
    },
    isOwner: false,
    isAdmin: viewer.isAdmin,
    isSupporter,
    activeTierIds,
  });

  return { ...base, allowed };
}

const DEFAULT_MEDIA_HOSTS = ["assets.agaseke.me", "res.cloudinary.com"];

/** Hosts the media proxy is allowed to fetch from, to prevent SSRF via post metadata. */
export function allowedMediaHosts(): string[] {
  const configured = process.env.MEDIA_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_MEDIA_HOSTS;
}

export function isAllowedMediaUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return allowedMediaHosts().includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * A media value is either a full URL in the public bucket or a bare object key
 * in the private bucket. Bare keys are served by the upload worker, so they are
 * accepted; anything else with an unexpected scheme is not.
 */
export function isServableMediaKey(value: string): boolean {
  if (!value) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return isAllowedMediaUrl(value);
  return isBareMediaKey(value);
}

/** True when the media value is a private-bucket object key rather than a URL. */
export function isPrivateObjectKey(value: string): boolean {
  return isBareMediaKey(value);
}
