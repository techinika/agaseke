"use client";

type ViewTarget = "creator" | "post";

const pendingBatch: Array<{ type: ViewTarget; id: string }> = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushClientBatch(): void {
  flushTimeout = null;
  if (pendingBatch.length === 0 || typeof window === "undefined") return;

  const items = pendingBatch.splice(0, 20);
  const payload = JSON.stringify({ items });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/public/views", blob)) {
        return;
      }
    }
  } catch {
    // Fall through to fetch
  }

  fetch("/api/public/views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export function trackView(type: ViewTarget, id: string): void {
  if (!id || typeof window === "undefined") return;
  pendingBatch.push({ type, id });
  if (pendingBatch.length >= 10) {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    flushClientBatch();
    return;
  }
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushClientBatch, 1500);
  }
}
