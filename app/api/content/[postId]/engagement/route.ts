import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";

const COMMS_WORKER_URL =
  process.env.NEXT_PUBLIC_COMMS_WORKER_URL || "http://localhost:8787";

interface EngagementBody {
  event?: "comment" | "like";
  commentText?: string;
  isReply?: boolean;
}

async function resolveCreatorInfo(
  postData: Record<string, unknown>,
): Promise<{ creatorUid: string; creatorHandle: string; creatorName: string }> {
  const creatorHandle =
    typeof postData.creatorId === "string" ? postData.creatorId.trim() : "";
  let creatorUid =
    typeof postData.creatorUid === "string" ? postData.creatorUid.trim() : "";
  let creatorName = "";

  if (creatorHandle) {
    const creatorSnap = await adminDb
      .collection("creators")
      .doc(creatorHandle)
      .get();
    if (creatorSnap.exists) {
      const c = creatorSnap.data() as Record<string, unknown>;
      if (!creatorUid && typeof c.uid === "string") creatorUid = c.uid.trim();
      if (typeof c.name === "string") creatorName = c.name.trim();
    }
  }

  if (!creatorName && creatorUid) {
    const profileSnap = await adminDb
      .collection("profiles")
      .doc(creatorUid)
      .get();
    if (profileSnap.exists) {
      const p = profileSnap.data() as Record<string, unknown>;
      if (typeof p.displayName === "string") creatorName = p.displayName.trim();
    }
  }

  return { creatorUid, creatorHandle, creatorName };
}

function buildContentMeta(
  postId: string,
  postData: Record<string, unknown>,
  creatorHandle: string,
) {
  const type = typeof postData.type === "string" ? postData.type : "post";
  const slug = typeof postData.slug === "string" ? postData.slug.trim() : "";
  const contentKind = type === "article" ? "article" : "post";
  const contentTitle =
    typeof postData.title === "string" ? postData.title.trim() : "";
  const contentPath =
    type === "article" && slug
      ? `/articles/${encodeURIComponent(slug)}`
      : creatorHandle
        ? `/${encodeURIComponent(creatorHandle)}/community/${encodeURIComponent(postId)}`
        : `/explore/posts/${encodeURIComponent(postId)}`;

  return { contentKind, contentTitle, contentPath };
}

async function sendComms(
  purpose: "content_comment" | "content_likes_milestone",
  data: Record<string, unknown>,
  authHeader: string | null,
): Promise<boolean> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  if (process.env.INTERNAL_AUTH_SECRET) {
    headers["X-Internal-Auth"] = process.env.INTERNAL_AUTH_SECRET;
  }

  try {
    const res = await fetch(COMMS_WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ purpose, data }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Comms ${purpose} failed (${res.status}):`, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Comms ${purpose} request failed:`, err);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: EngagementBody;
  try {
    body = (await request.json()) as EngagementBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.event !== "comment" && body.event !== "like") {
    return NextResponse.json(
      { error: "event must be 'comment' or 'like'" },
      { status: 400 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const postRef = adminDb.collection("creatorContent").doc(postId);

  try {
    if (body.event === "comment") {
      const postSnap = await postRef.get();
      if (!postSnap.exists) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
      }

      const postData = (postSnap.data() || {}) as Record<string, unknown>;
      const { creatorUid, creatorHandle, creatorName } =
        await resolveCreatorInfo(postData);

      if (!creatorUid && !creatorHandle) {
        return NextResponse.json({ ok: true, skipped: "missing_owner" });
      }

      if (creatorUid && authResult.uid === creatorUid) {
        return NextResponse.json({ ok: true, skipped: "own_content" });
      }

      const actorSnap = await adminDb
        .collection("profiles")
        .doc(authResult.uid)
        .get();
      const actorData = actorSnap.exists
        ? (actorSnap.data() as Record<string, unknown>)
        : {};
      const actorName =
        (typeof actorData.displayName === "string" &&
          actorData.displayName.trim()) ||
        (authResult.email ? authResult.email.split("@")[0] : "") ||
        "Someone";

      const { contentKind, contentTitle, contentPath } = buildContentMeta(
        postId,
        postData,
        creatorHandle,
      );

      const commentText =
        typeof body.commentText === "string"
          ? body.commentText.trim().slice(0, 500)
          : "";

      if (creatorUid) {
        const actionVerb = body.isReply ? "replied on" : "commented on";
        const notifMessage = contentTitle
          ? `${actorName} ${actionVerb} your ${contentKind} "${contentTitle}"`
          : `${actorName} ${actionVerb} your ${contentKind}`;

        await adminDb.collection("notifications").add({
          userId: creatorUid,
          type: "new_comment",
          title: body.isReply ? "New Reply!" : "New Comment!",
          message: notifMessage.slice(0, 1000),
          link: contentPath,
          actorName,
          actorId: authResult.uid,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          metadata: JSON.stringify({
            postId,
            postTitle: contentTitle,
            username: creatorHandle,
            contentKind,
          }),
        });
      }

      const emailSent = await sendComms(
        "content_comment",
        {
          creatorUid,
          creatorHandle,
          creatorName,
          commenterName: actorName,
          commentText,
          isReply: Boolean(body.isReply),
          contentKind,
          contentTitle,
          contentPath,
        },
        authHeader,
      );

      return NextResponse.json({ ok: true, notified: true, emailSent });
    }

    const txResult = await adminDb.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) {
        return { found: false as const };
      }

      const postData = (postSnap.data() || {}) as Record<string, unknown>;
      if (postData.likesMilestone10Notified === true) {
        return {
          found: true as const,
          milestoneReached: false as const,
          postData,
        };
      }

      const stats = (postData.stats || {}) as Record<string, unknown>;
      const statsLikes = typeof stats.likes === "number" ? stats.likes : 0;
      let effectiveLikes = statsLikes;
      if (effectiveLikes < 10) {
        const likesSnap = await tx.get(postRef.collection("likes").limit(10));
        effectiveLikes = Math.max(effectiveLikes, likesSnap.size);
      }

      if (effectiveLikes < 10) {
        return {
          found: true as const,
          milestoneReached: false as const,
          postData,
        };
      }

      tx.update(postRef, {
        likesMilestone10Notified: true,
        likesMilestone10NotifiedAt: FieldValue.serverTimestamp(),
      });

      return {
        found: true as const,
        milestoneReached: true as const,
        effectiveLikes,
        postData,
      };
    });

    if (!txResult.found) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (!txResult.milestoneReached) {
      return NextResponse.json({ ok: true, milestoneReached: false });
    }

    const { creatorUid, creatorHandle, creatorName } =
      await resolveCreatorInfo(txResult.postData);
    const { contentKind, contentTitle, contentPath } = buildContentMeta(
      postId,
      txResult.postData,
      creatorHandle,
    );

    if (creatorUid) {
      const notifMessage = contentTitle
        ? `Your ${contentKind} "${contentTitle}" reached 10 likes!`
        : `Your ${contentKind} reached 10 likes!`;

      await adminDb.collection("notifications").add({
        userId: creatorUid,
        type: "likes_milestone",
        title: "10 Likes Reached!",
        message: notifMessage.slice(0, 1000),
        link: contentPath,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        metadata: JSON.stringify({
          postId,
          postTitle: contentTitle,
          username: creatorHandle,
          contentKind,
          milestone: 10,
          likesCount: txResult.effectiveLikes,
        }),
      });
    }

    const emailSent = await sendComms(
      "content_likes_milestone",
      {
        creatorUid,
        creatorHandle,
        creatorName,
        milestone: 10,
        likesCount: txResult.effectiveLikes,
        contentKind,
        contentTitle,
        contentPath,
      },
      authHeader,
    );

    return NextResponse.json({
      ok: true,
      milestoneReached: true,
      emailSent,
    });
  } catch (error) {
    console.error("Failed to process content engagement:", error);
    return NextResponse.json(
      { error: "Failed to process engagement" },
      { status: 500 },
    );
  }
}
