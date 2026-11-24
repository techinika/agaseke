import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { PRE_MULTI_CURRENCY_CUTOFF_ISO } from "@/lib/money/historicalCurrency";
import {
  BACKFILL_COLLECTIONS,
  BACKFILL_COLLECTION_SET,
  runCurrencyBackfill,
  runLedgerBackfill,
  runLedgerReconcile,
  runMoneyEnablementCheck,
  type BackfillCollectionName,
} from "@/lib/admin/moneyMaintenance";

const VALID_SCRIPTS = new Set([
  "currency_backfill",
  "ledger_backfill",
  "ledger_reconcile",
  "enablement_check",
]);

const VALID_HANDLE_RE = /^[A-Za-z0-9_.-]{1,100}$/;

function clampLimit(raw: unknown, fallback = 500): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(2000, Math.trunc(n)));
}

export async function GET(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  return NextResponse.json({
    cutoffIso: PRE_MULTI_CURRENCY_CUTOFF_ISO,
    backfillCollections: BACKFILL_COLLECTIONS,
    scripts: [
      {
        id: "currency_backfill",
        label: "Historical Currency Backfill",
        supportsApply: true,
      },
      {
        id: "ledger_backfill",
        label: "Ledger Opening Balance Backfill",
        supportsApply: true,
      },
      {
        id: "ledger_reconcile",
        label: "Ledger Reconciliation Check",
        supportsApply: false,
      },
      {
        id: "enablement_check",
        label: "Currency & Rail Readiness Check",
        supportsApply: false,
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const script = typeof body.script === "string" ? body.script.trim() : "";
  if (!VALID_SCRIPTS.has(script)) {
    return NextResponse.json({ error: "Unsupported maintenance script" }, { status: 400 });
  }

  const mode = body.mode === "apply" ? "apply" : "dry-run";
  const apply = mode === "apply";
  const limit = clampLimit(body.limit, 500);
  const rawHandle = typeof body.handle === "string" ? body.handle.trim() : "";
  if (rawHandle && !VALID_HANDLE_RE.test(rawHandle)) {
    return NextResponse.json({ error: "Invalid creator handle filter" }, { status: 400 });
  }

  try {
    let result: Record<string, unknown>;

    if (script === "currency_backfill") {
      const requested = Array.isArray(body.collections)
        ? body.collections.filter((c): c is string => typeof c === "string")
        : [];
      const collections: BackfillCollectionName[] =
        requested.length > 0
          ? requested.filter((c): c is BackfillCollectionName =>
              BACKFILL_COLLECTION_SET.has(c),
            )
          : [...BACKFILL_COLLECTIONS];
      if (collections.length === 0) {
        return NextResponse.json(
          { error: "Select at least one valid collection" },
          { status: 400 },
        );
      }
      result = await runCurrencyBackfill({ apply, limit, collections });
    } else if (script === "ledger_backfill") {
      result = await runLedgerBackfill({
        apply,
        limit,
        ...(rawHandle ? { handle: rawHandle } : {}),
      });
    } else if (script === "ledger_reconcile") {
      result = await runLedgerReconcile({
        limit,
        ...(rawHandle ? { handle: rawHandle } : {}),
      });
    } else {
      result = await runMoneyEnablementCheck();
    }

    if (apply && (script === "currency_backfill" || script === "ledger_backfill")) {
      await adminDb.collection("activityLogs").add({
        level: "info",
        category: "admin_maintenance",
        message: `Admin executed ${script} (${mode})`,
        actorUid: authUser.uid,
        actorEmail: authUser.email ?? null,
        script,
        mode,
        summary: result.totals ?? result,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ ok: true, mode, result });
  } catch (error) {
    console.error("Admin maintenance script failed:", error);
    return NextResponse.json(
      { ok: false, error: "Maintenance script failed to execute" },
      { status: 500 },
    );
  }
}
