import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import {
  recoverUserTransaction,
  TransactionRecoveryError,
} from "@/lib/payments/transactionRecovery";

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { ref?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as { ref?: unknown; phone?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await recoverUserTransaction({
      uid: authUser.uid,
      userEmail: authUser.email,
      ref: typeof body.ref === "string" ? body.ref : "",
      allowPending: false,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      requestOrigin: request.headers.get("origin"),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TransactionRecoveryError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Retry transaction error:", error);
    return NextResponse.json(
      { error: "Failed to retry payment" },
      { status: 500 },
    );
  }
}
