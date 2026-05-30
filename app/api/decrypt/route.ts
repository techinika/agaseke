import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    const { encrypted } = await request.json();
    if (!encrypted || typeof encrypted !== "string") {
      return NextResponse.json({ error: "Encrypted text is required" }, { status: 400 });
    }
    const plaintext = decrypt(encrypted);
    return NextResponse.json({ plaintext });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
}
