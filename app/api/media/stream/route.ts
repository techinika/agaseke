import { NextRequest, NextResponse } from "next/server";
import {
  checkPostMediaAccess,
  isAllowedMediaUrl,
  isPrivateObjectKey,
  isServableMediaKey,
} from "@/lib/mediaAccess";
import { mediaTtlSeconds, signMediaKey, verifyMediaSignature } from "@/lib/mediaSigning";

const UPLOAD_WORKER_URL =
  process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL || "http://localhost:8787";

/**
 * Stream a post's media through the app so private assets are never requested
 * with a bare public URL. Access is granted by the signature issued from the
 * authenticated `/api/media/sign` route, and the requested key must still be
 * one of the post's media URLs.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const postId = params.get("postId") || "";
  const key = params.get("key") || "";
  const sig = params.get("sig") || "";
  const exp = Number(params.get("exp") || 0);

  if (!postId || !key || !sig || !Number.isFinite(exp)) {
    return NextResponse.json({ error: "postId, key, exp and sig are required" }, { status: 400 });
  }

  if (!verifyMediaSignature(postId, exp, sig)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 403 });
  }

  try {
    const access = await checkPostMediaAccess(postId, null);
    if (!access || !access.urls.includes(key)) {
      return NextResponse.json({ error: "Media not found for this post" }, { status: 404 });
    }

    if (!isServableMediaKey(key)) {
      return NextResponse.json({ error: "Media host not allowed" }, { status: 403 });
    }

    // Object keys live in the private bucket, which has no public domain. Hand
    // the browser a key-scoped grant and let Cloudflare serve the bytes.
    if (isPrivateObjectKey(key)) {
      const exp = Math.floor(Date.now() / 1000) + mediaTtlSeconds();
      const keySig = signMediaKey(key, exp);
      const target = `${UPLOAD_WORKER_URL.replace(/\/$/, "")}/private/${encodeURIComponent(key)}?exp=${exp}&sig=${keySig}`;

      return NextResponse.redirect(target, {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!isAllowedMediaUrl(key)) {
      return NextResponse.json({ error: "Media host not allowed" }, { status: 403 });
    }

    const range = request.headers.get("range");
    const upstream = await fetch(key, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: "Media unavailable" }, { status: 502 });
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("accept-ranges", acceptRanges);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("content-range", contentRange);

    // Private: the same URL must not be served from a shared cache to another user.
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("Content-Disposition", "inline");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Media stream error:", error);
    return NextResponse.json({ error: "Media unavailable" }, { status: 502 });
  }
}
