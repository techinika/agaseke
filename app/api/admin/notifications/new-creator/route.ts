import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/adminNotifications";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { creatorUid, creatorName, handle } = await req.json();

    const adminsSnap = await adminDb
      .collection("profiles")
      .where("isAdmin", "==", true)
      .get();

    for (const adminDoc of adminsSnap.docs) {
      await createNotification({
        userId: adminDoc.id,
        type: "new_creator",
        title: "New Creator",
        message: `${creatorName} (@${handle}) just joined as a creator`,
        link: `/admin/users`,
        actorName: creatorName,
        actorId: creatorUid,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("New creator notification error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}