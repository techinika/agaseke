import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authMiddleware";
import { adminAuth, adminDb } from "@/db/firebaseAdmin";

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { uid?: unknown; isAdmin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const uid = typeof body.uid === "string" ? body.uid : "";
  const isAdmin = body.isAdmin;

  if (!uid || typeof isAdmin !== "boolean") {
    return NextResponse.json(
      { error: "uid and isAdmin (boolean) are required" },
      { status: 400 },
    );
  }

  if (uid === authUser.uid && !isAdmin) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access" },
      { status: 400 },
    );
  }

  try {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: isAdmin,
    });

    await adminDb
      .collection("profiles")
      .doc(uid)
      .set(
        {
          isAdmin,
          adminUpdatedAt: new Date(),
          adminUpdatedBy: authUser.uid,
        },
        { merge: true },
      );

    await adminDb.collection("activityLogs").add({
      level: "info",
      category: "admin",
      message: `${isAdmin ? "Made admin" : "Removed admin from"}: ${uid}`,
      userId: uid,
      actorId: authUser.uid,
      actorEmail: authUser.email,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, uid, isAdmin });
  } catch (error) {
    console.error("Admin role update failed:", error);
    return NextResponse.json({ error: "Failed to update admin role" }, { status: 500 });
  }
}
