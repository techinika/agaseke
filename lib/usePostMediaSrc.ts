"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";

interface MediaGrant {
  postId: string;
  exp: number;
  sig: string;
  urls: string[];
}

/** Cache grants across components so one post signs once per mount cycle. */
const grantCache = new Map<string, MediaGrant>();

function cachedGrant(postId: string | undefined): MediaGrant | null {
  if (!postId) return null;
  const cached = grantCache.get(postId);
  if (!cached) return null;
  if (cached.exp * 1000 <= Date.now() + 30_000) return null;
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
  const [result, setResult] = useState<MediaGrant | null>(null);
  const [deniedPostId, setDeniedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !isPrivate) return;
    if (cachedGrant(postId)) return;
    if (!user) return;

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
          setDeniedPostId(postId);
          return;
        }

        const data = (await res.json()) as MediaGrant;
        grantCache.set(postId, data);
        setResult(data);
      } catch {
        if (!cancelled) setDeniedPostId(postId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, isPrivate, user]);

  const grant = result?.postId === postId ? result : cachedGrant(postId);
  const denied = isPrivate && (!user || deniedPostId === postId);

  const mediaSrc = useCallback(
    (url: string | null | undefined): string | null => {
      if (!url) return null;
      if (!isPrivate) return url;
      if (!grant || !postId) return null;

      const params = new URLSearchParams({
        postId,
        key: url,
        exp: String(grant.exp),
        sig: grant.sig,
      });
      return `/api/media/stream?${params.toString()}`;
    },
    [grant, isPrivate, postId],
  );

  return { mediaSrc, denied };
}
