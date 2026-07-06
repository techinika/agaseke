import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";
import { requireAuth } from "@/lib/authMiddleware";

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    const encrypted = encrypt(text);
    return NextResponse.json({ encrypted });
  } catch (error) {
    console.error("Encryption error:", error);
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 });
  }
}
