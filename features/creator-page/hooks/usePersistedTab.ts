"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const TAB_EVENT = "agaseke:tab-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(TAB_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TAB_EVENT, onChange);
  };
}

/**
 * Remembers the last creator tab without a post-mount setState. The server
 * snapshot is always the fallback, so hydration is stable; the client then
 * reads localStorage through useSyncExternalStore.
 */
export function usePersistedTab(
  key: string,
  fallback: string,
  validIds: readonly string[],
) {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
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
      window.dispatchEvent(new Event(TAB_EVENT));
    },
    [key],
  );

  const value = useMemo(
    () => (validIds.includes(stored) ? stored : fallback),
    [fallback, stored, validIds],
  );

  return [value, setValue] as const;
}
