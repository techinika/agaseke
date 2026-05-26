import { NextRequest, NextResponse } from "next/server";
import { adminDb, admin } from "@/db/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, category, message, userId, userEmail, userName, creatorId, creatorHandle, metadata, error } = body;

    const logEntry: Record<string, unknown> = {
      level: level || "error",
      category: category || "system",
      message: message || "Unknown client error",
      userId: userId || null,
      userEmail: userEmail || null,
      userName: userName || null,
      creatorId: creatorId || null,
      creatorHandle: creatorHandle || null,
      metadata: metadata || {},
      error: error ? JSON.stringify(error).slice(0, 5000) : null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await adminDb.collection("activityLogs").add(logEntry);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error logging endpoint failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
