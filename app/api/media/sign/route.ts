import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import { checkPostMediaAccess, isAllowedMediaUrl } from "@/lib/mediaAccess";
import { mediaTtlSeconds, signMediaPost } from "@/lib/mediaSigning";

/**
 * Exchange an authenticated session for short-lived access to a post's media.
 * The response only contains URLs the caller is entitled to, and the signature
 * is scoped to this post until `exp`.
 */
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { postId?: unknown };
  try {
    body = (await request.json()) as { postId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId = typeof body.postId === "string" ? body.postId.trim() : "";
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  try {
    const access = await checkPostMediaAccess(postId, {
      uid: authUser.uid,
      isAdmin: authUser.isAdmin,
    });

    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json(
        { error: "This content is available to supporters only" },
        { status: 403 },
      );
    }

    const exp = Math.floor(Date.now() / 1000) + mediaTtlSeconds();
    const sig = signMediaPost(postId, exp);
    const urls = access.urls.filter(isAllowedMediaUrl);

    return NextResponse.json(
      { postId, exp, sig, urls, ttl: mediaTtlSeconds() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Media signing error:", error);
    return NextResponse.json({ error: "Signing unavailable" }, { status: 503 });
  }
}
