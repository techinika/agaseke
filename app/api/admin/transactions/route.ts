import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { resolveHistoricalCurrency } from "@/lib/money";

const STALL_TIMEOUT_MS = 15 * 60 * 1000;
const ALLOWED_STATUSES = new Set([
  "all",
  "successful",
  "pending",
  "stalled",
  "failed",
  "cancelled",
]);
const ALLOWED_TYPES = new Set([
  "all",
  "support",
  "gift",
  "store",
  "booking",
  "gathering",
  "community",
]);
const ALLOWED_METHODS = new Set(["all", "momo", "card"]);

function toStr(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toIsoString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : "";
  }
  if (typeof value === "object") {
    const record = value as {
      toDate?: () => Date;
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof record.toDate === "function") {
      const d = record.toDate();
      return d && Number.isFinite(d.getTime()) ? d.toISOString() : "";
    }
    if (typeof record.toMillis === "function") {
      return new Date(record.toMillis()).toISOString();
    }
    const sec = typeof record.seconds === "number" ? record.seconds : record._seconds;
    if (typeof sec === "number" && Number.isFinite(sec)) {
      return new Date(sec * 1000).toISOString();
    }
  }
  return "";
}

function normalizeStatus(tx: Record<string, unknown>, createdAtIso: string, nowMs: number): string {
  const raw = toStr(tx.status).trim().toLowerCase() || "pending";
  if (raw === "success" || raw === "successful" || raw === "completed" || raw === "paid") {
    return "successful";
  }
  if (raw === "canceled" || raw === "cancelled") {
    return "cancelled";
  }
  if (raw === "stale" || raw === "stalled") {
    return "stalled";
  }
  if (raw === "pending") {
    const tsIso = toIsoString(tx.initiatedAt) || createdAtIso;
    const tsMs = Date.parse(tsIso);
    if (Number.isFinite(tsMs) && nowMs - tsMs >= STALL_TIMEOUT_MS) {
      return "stalled";
    }
    return "pending";
  }
  if (raw === "failure" || raw === "reversed" || raw === "declined" || raw === "expired") {
    return "failed";
  }
  return raw;
}

function inferMethod(tx: Record<string, unknown>, ref: string): string {
  const explicit = toStr(tx.paymentMethod).trim().toLowerCase();
  if (explicit === "card" || explicit === "momo") return explicit;
  if (
    toStr(tx.paymentProvider).toLowerCase() === "pesapal" ||
    ref.startsWith("AGS-CARD-") ||
    Boolean(toStr(tx.redirectUrl))
  ) {
    return "card";
  }
  if (toStr(tx.type) === "gathering" || Boolean(toStr(tx.phone))) {
    return "momo";
  }
  return explicit || "momo";
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const rawPage = Number(searchParams.get("page") || "1");
  const rawPageSize = Number(searchParams.get("pageSize") || "25");
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.max(1, Math.min(100, Math.trunc(rawPageSize)))
    : 25;

  const statusParam = (searchParams.get("status") || "all").trim().toLowerCase();
  const statusFilter = ALLOWED_STATUSES.has(statusParam) ? statusParam : "all";

  const typeParam = (searchParams.get("type") || "all").trim().toLowerCase();
  const typeFilter = ALLOWED_TYPES.has(typeParam) ? typeParam : "all";

  const methodParam = (searchParams.get("method") || "all").trim().toLowerCase();
  const methodFilter = ALLOWED_METHODS.has(methodParam) ? methodParam : "all";

  const search = (searchParams.get("search") || "").trim().toLowerCase();

  try {
    let docs;
    try {
      const snap = await adminDb
        .collection("transactions")
        .orderBy("createdAt", "desc")
        .get();
      docs = snap.docs;
    } catch {
      const snap = await adminDb.collection("transactions").get();
      docs = snap.docs;
    }

    const nowMs = Date.now();
    const counts: Record<string, number> = {
      all: 0,
      successful: 0,
      pending: 0,
      stalled: 0,
      failed: 0,
      cancelled: 0,
    };

    const normalizedAll = docs.map((doc) => {
      const data = (doc.data() || {}) as Record<string, unknown>;
      const ref = toStr(data.ref) || doc.id;
      const createdAt = toIsoString(data.createdAt) || toIsoString(data.initiatedAt);
      const status = normalizeStatus(data, createdAt, nowMs);
      const type = toStr(data.type).trim().toLowerCase() || "support";
      const paymentMethod = inferMethod(data, ref);

      counts.all += 1;
      if (status in counts && status !== "all") {
        counts[status] += 1;
      }

      return {
        id: doc.id,
        ref,
        providerRef: toStr(data.providerRef),
        orderTrackingId: toStr(data.orderTrackingId),
        type,
        status,
        paymentMethod,
        amount: toNum(data.amount),
        currency: resolveHistoricalCurrency(data),
        sourceCurrency: toStr(data.sourceCurrency),
        sourceAmountMinor: toNum(data.sourceAmountMinor),
        fxRate: toNum(data.fxRate),
        creatorId: toStr(data.creatorId) || toStr(data.creatorHandle),
        creatorUid: toStr(data.creatorUid),
        creatorName: toStr(data.creatorName),
        supporterId: toStr(data.supporterId),
        initiatedBy: toStr(data.initiatedBy),
        payerName:
          toStr(data.supporterName) ||
          toStr(data.buyerName) ||
          toStr(data.attendeeName) ||
          "",
        payerEmail:
          toStr(data.buyerEmail) ||
          toStr(data.email) ||
          toStr(data.attendeeEmail) ||
          "",
        phone: toStr(data.phone),
        productId: toStr(data.productId),
        productName: toStr(data.productName),
        message: toStr(data.message),
        createdAt,
        successfulAt: toIsoString(data.successfulAt),
        stalledAt: toIsoString(data.stalledAt),
        cancelledAt: toIsoString(data.cancelledAt),
        failedAt: toIsoString(data.failedAt),
        retriedRef: toStr(data.retriedRef),
        retryOfRef: toStr(data.retryOfRef),
        redirectUrl: toStr(data.redirectUrl),
      };
    });

    normalizedAll.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const filtered = normalizedAll.filter((tx) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (methodFilter !== "all" && tx.paymentMethod !== methodFilter) return false;
      if (search) {
        const haystack = [
          tx.ref,
          tx.providerRef,
          tx.orderTrackingId,
          tx.creatorId,
          tx.creatorName,
          tx.payerName,
          tx.payerEmail,
          tx.phone,
          tx.productName,
          tx.supporterId,
          tx.initiatedBy,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    const missingHandles = [
      ...new Set(
        pageRows
          .filter((tx) => !tx.creatorName && tx.creatorId)
          .map((tx) => tx.creatorId),
      ),
    ];
    const nameByHandle: Record<string, string> = {};
    if (missingHandles.length > 0) {
      await Promise.all(
        missingHandles.map(async (handle) => {
          try {
            const snap = await adminDb.collection("creators").doc(handle).get();
            const name = snap.exists ? toStr(snap.data()?.name).trim() : "";
            if (name) nameByHandle[handle] = name;
          } catch {
            // ignore missing creator lookup
          }
        }),
      );
    }

    const transactions = pageRows.map((tx) => ({
      ...tx,
      creatorName: tx.creatorName || nameByHandle[tx.creatorId] || "",
    }));

    return NextResponse.json({
      transactions,
      total,
      page: safePage,
      pageSize,
      totalPages,
      counts,
    });
  } catch (error) {
    console.error("Failed to fetch admin transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 },
    );
  }
}
