import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";
import { buildPayoutOverview, enrichPayoutOverviewWithFx } from "@/lib/payouts/overview";
import { resolveTargetPayoutAccount } from "@/lib/payouts/targetAccount";
import { loadFxSnapshot } from "@/lib/payouts/withdrawalConversion";

function parseTimeMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string" || typeof value === "number") {
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object") {
    const record = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof record.toMillis === "function") return record.toMillis();
    const sec = typeof record.seconds === "number" ? record.seconds : record._seconds;
    if (typeof sec === "number") return sec * 1000;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    const [creatorSnap, currenciesSnap, verifSnap] = await Promise.all([
      adminDb.collection("creators").where("uid", "==", authUser.uid).limit(1).get(),
      adminDb.collection("currencies").get(),
      adminDb.collection("verificationRequests").where("uid", "==", authUser.uid).limit(10).get(),
    ]);

    if (creatorSnap.empty) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const creatorData = (creatorSnap.docs[0].data() || {}) as Record<string, unknown>;
    const policies = currenciesSnap.docs.map(
      (d) => (d.data() || {}) as { code?: unknown; payoutThreshold?: unknown },
    );

    const verifRows = verifSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) }) as Record<string, unknown>)
      .sort((a, b) => parseTimeMs(b.createdAt) - parseTimeMs(a.createdAt));
    const preferredVerif =
      verifRows.find((r) => String(r.status || "").toLowerCase() === "approved") ??
      verifRows[0] ??
      null;

    const overview = buildPayoutOverview(creatorData, policies);
    let snapshot = null;
    try {
      snapshot = await loadFxSnapshot();
    } catch {
      snapshot = null;
    }

    const spreadBps = Math.max(
      0,
      Math.min(
        9999,
        Math.trunc(
          Number(process.env.FX_WITHDRAWAL_SPREAD_BPS || process.env.FX_SPREAD_BPS || 150),
        ),
      ),
    );
    const enriched = enrichPayoutOverviewWithFx(overview, snapshot, spreadBps);
    const targetAccount = resolveTargetPayoutAccount(creatorData, preferredVerif);

    return NextResponse.json({
      ...enriched,
      targetAccount,
    });
  } catch (error) {
    console.error("Failed to fetch payout overview:", error);
    return NextResponse.json({ error: "Failed to load payout overview" }, { status: 500 });
  }
}
