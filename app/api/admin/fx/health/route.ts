import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { isSnapshotFresh, parseFxSnapshot } from "@/lib/money";

export async function GET(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    const [fxSnap, pendingSnap] = await Promise.all([
      adminDb.collection("fxRates").doc("latest").get(),
      adminDb.collection("withdrawRequests").where("status", "==", "pending").get(),
    ]);

    const pendingByCurrency: Record<string, { count: number; amount: number }> = {};
    for (const doc of pendingSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const currency = String(data.payoutCurrency || data.currency || "UNKNOWN");
      const amount = Number(data.amount || 0);
      if (!pendingByCurrency[currency]) pendingByCurrency[currency] = { count: 0, amount: 0 };
      pendingByCurrency[currency].count += 1;
      if (Number.isFinite(amount)) pendingByCurrency[currency].amount += amount;
    }

    if (!fxSnap.exists) {
      return NextResponse.json({
        ok: false,
        status: "missing",
        message: "No cached FX snapshot found (fxRates/latest).",
        pendingWithdrawals: { total: pendingSnap.size, byCurrency: pendingByCurrency },
      });
    }

    const raw = fxSnap.data() as Record<string, unknown>;
    let parsed;
    try {
      parsed = parseFxSnapshot(raw);
    } catch (error) {
      return NextResponse.json({
        ok: false,
        status: "invalid",
        message: error instanceof Error ? error.message : "Invalid FX snapshot",
        raw: {
          base: raw.base,
          fetchedAt: raw.fetchedAt,
          source: raw.source,
          rateCount:
            raw.rates && typeof raw.rates === "object"
              ? Object.keys(raw.rates as object).length
              : 0,
        },
        pendingWithdrawals: { total: pendingSnap.size, byCurrency: pendingByCurrency },
      });
    }

    const maxAgeMinutes = Math.max(
      1,
      Math.trunc(Number(process.env.FX_RATE_MAX_AGE_MINUTES || 24 * 60)),
    );
    const fresh = isSnapshotFresh(parsed, new Date(), maxAgeMinutes);
    const expiresAtMs = parsed.expiresAt ? Date.parse(parsed.expiresAt) : null;
    const fetchedAtMs = Date.parse(parsed.fetchedAt);

    return NextResponse.json({
      ok: fresh,
      status: fresh ? "fresh" : "stale",
      base: parsed.base,
      source: parsed.source,
      fetchedAt: parsed.fetchedAt,
      expiresAt: parsed.expiresAt ?? null,
      ageMinutes: Number.isFinite(fetchedAtMs)
        ? Math.round((Date.now() - fetchedAtMs) / 60000)
        : null,
      expiresInMinutes:
        expiresAtMs && Number.isFinite(expiresAtMs)
          ? Math.round((expiresAtMs - Date.now()) / 60000)
          : null,
      maxAgeMinutes,
      rateCount: Object.keys(parsed.rates).length,
      currencies: Object.keys(parsed.rates).sort(),
      pendingWithdrawals: { total: pendingSnap.size, byCurrency: pendingByCurrency },
    });
  } catch (error) {
    console.error("FX health check failed:", error);
    return NextResponse.json(
      { ok: false, status: "error", message: "Failed to read FX snapshot" },
      { status: 500 },
    );
  }
}
