import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/adminNotifications";
import { adminDb } from "@/db/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, userEmail } = await req.json();

    const adminsSnap = await adminDb
      .collection("profiles")
      .where("isAdmin", "==", true)
      .get();

    for (const adminDoc of adminsSnap.docs) {
      await createNotification({
        userId: adminDoc.id,
        type: "new_user",
        title: "New User",
        message: `${userName} (${userEmail}) just joined the platform`,
        link: "/admin/users",
        actorName: userName,
        actorId: userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("New user notification error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}