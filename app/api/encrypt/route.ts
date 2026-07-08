import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET || "dev-secret";

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    const body = await request.json();
    const res = await fetch(`${GENERAL_WORKER_URL}/api/general/encrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": INTERNAL_AUTH_SECRET,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Encryption proxy error:", error);
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 });
  }
}
