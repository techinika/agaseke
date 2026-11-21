import { NextRequest, NextResponse } from "next/server";
import { optionalAuth } from "@/lib/authMiddleware";
import { formatVisibilityLabel } from "@/lib/contentAccess";
import { checkPostMediaAccess } from "@/lib/mediaAccess";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  const ts = value as { toDate?: () => Date; seconds?: number };
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const authResult = await optionalAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const access = await checkPostMediaAccess(
      postId,
      authResult ? { uid: authResult.uid, isAdmin: authResult.isAdmin } : null,
    );

    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!access.allowed) {
      const label = formatVisibilityLabel(
        access.visibility,
        access.requiredTierNames,
      );
      return NextResponse.json(
        {
          unlocked: false,
          error: `This content is available to ${label.toLowerCase()}`,
          visibility: access.visibility,
          requiredTierIds: access.requiredTierIds,
          requiredTierNames: access.requiredTierNames,
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const d = access.data;
    const stats = (d.stats || {}) as Record<string, unknown>;
    return NextResponse.json(
      {
        unlocked: true,
        post: {
          id: postId,
          title: typeof d.title === "string" ? d.title : "",
          description: typeof d.description === "string" ? d.description : "",
          shortDescription:
            typeof d.shortDescription === "string" ? d.shortDescription : "",
          content: typeof d.content === "string" ? d.content : "",
          htmlContent: typeof d.htmlContent === "string" ? d.htmlContent : "",
          type: typeof d.type === "string" ? d.type : "post",
          coverUrl: typeof d.coverUrl === "string" ? d.coverUrl : "",
          contentUrl: (d.contentUrl as string | string[] | null) ?? null,
          slug: typeof d.slug === "string" ? d.slug : "",
          visibility: access.visibility,
          isPrivate: access.isPrivate,
          requiredTierIds: access.requiredTierIds,
          requiredTierNames: access.requiredTierNames,
          commentCount: typeof d.commentCount === "number" ? d.commentCount : 0,
          views: typeof d.views === "number" ? d.views : 0,
          likesCount: typeof stats.likes === "number" ? stats.likes : 0,
          creatorId: typeof d.creatorId === "string" ? d.creatorId : "",
          creatorUid: typeof d.creatorUid === "string" ? d.creatorUid : "",
          createdAt: toIso(d.createdAt),
          publishedAt: toIso(d.publishedAt),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to unlock content:", error);
    return NextResponse.json(
      { error: "Unable to load content" },
      { status: 500 },
    );
  }
}
