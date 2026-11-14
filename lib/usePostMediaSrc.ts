"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";

interface MediaGrant {
  postId: string;
  exp: number;
  sig: string;
  urls: string[];
  uid: string;
}

/** Cache grants per user, so switching accounts cannot reuse another grant. */
const grantCache = new Map<string, MediaGrant>();

function grantKey(postId: string, uid: string): string {
  return `${uid}:${postId}`;
}

function cachedGrant(postId: string | undefined, uid: string | undefined): MediaGrant | null {
  if (!postId || !uid) return null;
  const key = grantKey(postId, uid);
  const cached = grantCache.get(key);
  if (!cached) return null;
  if (cached.exp * 1000 <= Date.now() + 30_000) {
    grantCache.delete(key);
    return null;
  }
  return cached;
}

/**
 * Resolve media URLs for a creator post.
 *
 * Public posts keep their direct asset URL. Private posts are only fetched after
 * the signed `/api/media/sign` route confirms the viewer is entitled, and the
 * returned `mediaSrc` points at the streaming proxy. `mediaSrc` returns `null`
 * while access is unresolved or denied, so callers can skip the asset instead of
 * requesting the raw URL.
 */
export function usePostMediaSrc(postId: string | undefined, isPrivate: boolean) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [fetched, setFetched] = useState<{
    postId: string;
    uid: string;
    grant: MediaGrant;
  } | null>(null);
  const [denied, setDenied] = useState<{
    postId: string;
    uid: string;
  } | null>(null);

  useEffect(() => {
    if (!postId || !isPrivate || !uid) return;
    if (cachedGrant(postId, uid)) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/media/sign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ postId }),
        });

        if (cancelled) return;

        if (!res.ok) {
          setDenied({ postId, uid });
          return;
        }

        const data = (await res.json()) as Omit<MediaGrant, "uid">;
        const grant: MediaGrant = { ...data, uid };
        grantCache.set(grantKey(postId, uid), grant);
        setFetched({ postId, uid, grant });
      } catch {
        if (!cancelled) setDenied({ postId, uid });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, isPrivate, uid, user]);

  const grant =
    fetched && fetched.postId === postId && fetched.uid === uid
      ? fetched.grant
      : cachedGrant(postId, uid);
  const deniedNow =
    isPrivate &&
    (!uid || (!!denied && denied.postId === postId && denied.uid === uid));

  const mediaSrc = useCallback(
    (url: string | null | undefined): string | null => {
      if (!url) return null;
      if (!isPrivate) return url;
      if (!uid || !postId || deniedNow || !grant || grant.uid !== uid) return null;
      if (grant.exp * 1000 <= Date.now() + 30_000) return null;

      const params = new URLSearchParams({
        postId,
        key: url,
        exp: String(grant.exp),
        sig: grant.sig,
      });
      return `/api/media/stream?${params.toString()}`;
    },
    [grant, isPrivate, postId, uid, deniedNow],
  );

  return { mediaSrc, denied: deniedNow };
}
