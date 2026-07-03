import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
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
