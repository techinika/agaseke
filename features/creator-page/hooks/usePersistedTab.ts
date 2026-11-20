"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const TAB_EVENT = "agaseke:tab-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(TAB_EVENT, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TAB_EVENT, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function readTabFromLocation(validIds: readonly string[]): string | null {
  if (typeof window === "undefined") return null;
  try {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param && validIds.includes(param)) return param;
  } catch {
    // Ignore malformed query strings
  }
  return null;
}

/**
 * Remembers the last creator tab without a post-mount setState, while honoring
 * an explicit `?tab=` query parameter when present.
 */
export function usePersistedTab(
  key: string,
  fallback: string,
  validIds: readonly string[],
) {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      const fromUrl = readTabFromLocation(validIds);
      if (fromUrl) return fromUrl;
      try {
        return window.localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Private mode can block storage; the tab still changes for this render.
      }
      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has("tab")) {
            url.searchParams.set("tab", next);
            window.history.replaceState(null, "", url.pathname + url.search + url.hash);
          }
        } catch {
          // Ignore URL history errors
        }
        window.dispatchEvent(new Event(TAB_EVENT));
      }
    },
    [key],
  );

  const value = useMemo(
    () => (validIds.includes(stored) ? stored : fallback),
    [fallback, stored, validIds],
  );

  return [value, setValue] as const;
}
