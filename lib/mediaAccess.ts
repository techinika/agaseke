import { adminDb } from "@/db/firebaseAdmin";

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
  urls: string[];
  title: string;
}

/**
 * Decide whether `viewer` may load the media attached to a creator post.
 *
 * Public posts are readable by anyone. Private posts require the creator, an
 * admin, or an existing supporter relationship. The result is authoritative for
 * both issuing a signed URL and streaming it.
 */
export async function checkPostMediaAccess(
  postId: string,
  viewer: { uid: string; isAdmin: boolean } | null,
): Promise<MediaAccess | null> {
  const snap = await adminDb.collection("creatorContent").doc(postId).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  const isPrivate = data.isPrivate === true;
  const urls = collectPostMediaUrls(data);
  const title = typeof data.title === "string" ? data.title : "";

  if (!isPrivate) return { allowed: true, isPrivate, urls, title };
  if (!viewer) return { allowed: false, isPrivate, urls, title };

  if (viewer.isAdmin) return { allowed: true, isPrivate, urls, title };

  const creatorUid = typeof data.creatorUid === "string" ? data.creatorUid : "";
  const creatorId = typeof data.creatorId === "string" ? data.creatorId : "";

  if (creatorUid === viewer.uid || creatorId === viewer.uid) {
    return { allowed: true, isPrivate, urls, title };
  }

  if (creatorId) {
    const creatorSnap = await adminDb.collection("creators").doc(creatorId).get();
    if (creatorSnap.exists && creatorSnap.data()?.uid === viewer.uid) {
      return { allowed: true, isPrivate, urls, title };
    }
  }

  const candidateCreatorIds = [
    creatorId,
    typeof data.creatorHandle === "string" ? data.creatorHandle : "",
  ].filter(Boolean);

  if (candidateCreatorIds.length === 0) {
    return { allowed: false, isPrivate, urls, title };
  }

  const supportSnap = await adminDb
    .collection("supportedCreators")
    .where("supporterId", "==", viewer.uid)
    .where("creatorId", "in", [...new Set(candidateCreatorIds)].slice(0, 10))
    .limit(1)
    .get();

  return { allowed: !supportSnap.empty, isPrivate, urls, title };
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
