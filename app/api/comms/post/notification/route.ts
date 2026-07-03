import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/adminNotifications";

export async function POST(req: NextRequest) {
  try {
    const { creatorUid, type, actorName, actorId, postTitle, postId, username } = await req.json();

    if (!creatorUid || !type || !actorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const title = type === "like" ? "New Like!" : "New Comment!";
    const message =
      type === "like"
        ? `${actorName || "Someone"} liked your post${postTitle ? ` "${postTitle}"` : ""}`
        : `${actorName || "Someone"} commented on your post${postTitle ? ` "${postTitle}"` : ""}`;

    await createNotification({
      userId: creatorUid,
      type: type === "like" ? "new_like" : "new_comment",
      title,
      message,
      link: `/${username}/community/${postId}`,
      actorName,
      actorId,
      metadata: { postId, postTitle, username },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create post notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
