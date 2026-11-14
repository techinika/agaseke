import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9_]{3,19}$/;

export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("username") || "")
    .trim()
    .toLowerCase();

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ exists: false, valid: false });
  }

  try {
    const snap = await adminDb.collection("creators").doc(username).get();
    return NextResponse.json({ exists: snap.exists, valid: true });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { exists: false, valid: true, unavailable: true },
      { status: 200 },
    );
  }
}
