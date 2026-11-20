import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";

export const dynamic = "force-dynamic";

type ViewTarget = "creator" | "post";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_KEYS = 25;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const pendingCreatorViews = new Map<string, number>();
const pendingPostViews = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

async function flushViews(): Promise<void> {
  if (flushing) return;
  if (pendingCreatorViews.size === 0 && pendingPostViews.size === 0) return;

  flushing = true;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const creatorEntries = Array.from(pendingCreatorViews.entries());
  const postEntries = Array.from(pendingPostViews.entries());
  pendingCreatorViews.clear();
  pendingPostViews.clear();

  try {
    const batch = adminDb.batch();
    let count = 0;

    for (const [handle, delta] of creatorEntries) {
      if (delta <= 0) continue;
      batch.update(adminDb.collection("creators").doc(handle), {
        views: admin.firestore.FieldValue.increment(delta),
      });
      count += 1;
    }

    for (const [postId, delta] of postEntries) {
      if (delta <= 0) continue;
      batch.update(adminDb.collection("creatorContent").doc(postId), {
        views: admin.firestore.FieldValue.increment(delta),
      });
      count += 1;
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    // Individual updates isolate missing/deleted docs without dropping valid counters
    for (const [handle, delta] of creatorEntries) {
      adminDb
        .collection("creators")
        .doc(handle)
        .update({ views: admin.firestore.FieldValue.increment(delta) })
        .catch(() => {});
    }
    for (const [postId, delta] of postEntries) {
      adminDb
        .collection("creatorContent")
        .doc(postId)
        .update({ views: admin.firestore.FieldValue.increment(delta) })
        .catch(() => {});
    }
    console.warn("Batched view flush fell back to per-doc updates:", error);
  } finally {
    flushing = false;
    if (pendingCreatorViews.size > 0 || pendingPostViews.size > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush(): void {
  const totalKeys = pendingCreatorViews.size + pendingPostViews.size;
  if (totalKeys >= MAX_BATCH_KEYS) {
    void flushViews();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushViews();
    }, FLUSH_INTERVAL_MS);
  }
}

function queueView(target: ViewTarget, id: string): void {
  const map = target === "creator" ? pendingCreatorViews : pendingPostViews;
  map.set(id, (map.get(id) ?? 0) + 1);
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const body = JSON.parse(raw) as {
      items?: Array<{ type?: string; id?: string }>;
      type?: string;
      id?: string;
    };

    const entries = Array.isArray(body.items)
      ? body.items
      : [{ type: body.type, id: body.id }];

    let queued = 0;
    for (const entry of entries.slice(0, 20)) {
      const target = entry?.type;
      const id = typeof entry?.id === "string" ? entry.id.trim() : "";
      if ((target !== "creator" && target !== "post") || !SAFE_ID_RE.test(id)) {
        continue;
      }
      queueView(target, id);
      queued += 1;
    }

    if (queued > 0) {
      scheduleFlush();
    }

    return NextResponse.json({ ok: true, queued }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
