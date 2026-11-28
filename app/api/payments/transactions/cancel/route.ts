import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import {
  cancelUserTransaction,
  TransactionRecoveryError,
} from "@/lib/payments/transactionRecovery";

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { ref?: unknown };
  try {
    body = (await request.json()) as { ref?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await cancelUserTransaction({
      uid: authUser.uid,
      userEmail: authUser.email,
      ref: typeof body.ref === "string" ? body.ref : "",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TransactionRecoveryError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Cancel transaction error:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 },
    );
  }
}
