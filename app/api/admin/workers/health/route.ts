import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import {
  runWorkerDiagnostics,
  type RecentDbFailure,
} from "@/lib/admin/workerDiagnostics";

function toIsoSafe(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof maybe.toDate === "function") {
      return maybe.toDate().toISOString();
    }
    const seconds =
      typeof maybe.seconds === "number"
        ? maybe.seconds
        : typeof maybe._seconds === "number"
          ? maybe._seconds
          : null;
    if (seconds !== null) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

async function loadRecentDbFailures(): Promise<RecentDbFailure[]> {
  try {
    const snap = await adminDb
      .collection("activityLogs")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const failures: RecentDbFailure[] = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      if (data.category !== "db") continue;
      const isFailure =
        data.level === "error" || data.outcome === "failed";
      if (!isFailure) continue;

      failures.push({
        id: docSnap.id,
        method: String(data.method || "DB"),
        path: String(data.path || data.message || "unknown"),
        status: typeof data.status === "number" ? data.status : null,
        error: String(data.error || data.message || "Database operation failed"),
        durationMs: typeof data.durationMs === "number" ? data.durationMs : null,
        createdAt: toIsoSafe(data.createdAt),
      });

      if (failures.length >= 10) break;
    }

    return failures;
  } catch (err) {
    console.error("Failed to fetch recent DB failure logs:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  try {
    const [recentDbFailures, report] = await Promise.all([
      loadRecentDbFailures(),
      runWorkerDiagnostics({
        internalAuthSecret: process.env.INTERNAL_AUTH_SECRET,
        authorizationHeader: request.headers.get("authorization"),
      }),
    ]);

    return NextResponse.json(
      {
        ...report,
        recentDbFailures,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("Worker diagnostics check failed:", err);
    return NextResponse.json(
      { error: "Failed to run worker diagnostics" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
