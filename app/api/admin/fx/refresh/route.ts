import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authMiddleware";
import { syncLatestFxRates } from "@/lib/money/frankfurterSync";

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    const result = await syncLatestFxRates({
      actorUid: authUser.uid,
      actorEmail: authUser.email,
    });

    return NextResponse.json({
      ok: true,
      base: result.snapshot.base,
      source: result.snapshot.source,
      fetchedAt: result.snapshot.fetchedAt,
      expiresAt: result.snapshot.expiresAt ?? null,
      rateCount: result.rateCount,
      historyId: result.historyId,
    });
  } catch (error) {
    console.error("Manual FX refresh failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh FX rates from Frankfurter API",
      },
      { status: 502 },
    );
  }
}
