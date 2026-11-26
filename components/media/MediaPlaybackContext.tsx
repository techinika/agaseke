"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  activateMediaRef,
  getActiveMediaId,
  notifyMediaPaused,
  pauseAllMediaRefs,
  registerMediaRef,
  subscribeActiveMedia,
} from "@/lib/media/pauseOtherMedia";

export interface MediaPlaybackContextValue {
  activeId: string | null;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
  globalPlaybackRate: number;
  setGlobalPlaybackRate: (rate: number) => void;
  registerMedia: (id: string, element: HTMLMediaElement | null) => void;
  activateMedia: (id: string, element: HTMLMediaElement | null) => void;
  notifyPaused: (id: string, element?: HTMLMediaElement | null) => void;
  pauseAll: (exceptId?: string) => void;
}

const MediaPlaybackContext = createContext<MediaPlaybackContextValue | null>(null);

export function MediaPlaybackProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMediaId());
  const [globalMuted, setGlobalMuted] = useState(false);
  const [globalPlaybackRate, setGlobalPlaybackRate] = useState(1);
  const activeElementRef = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    return subscribeActiveMedia((nextId) => {
      setActiveId(nextId);
    });
  }, []);

  const registerMedia = useCallback(
    (id: string, element: HTMLMediaElement | null) => {
      registerMediaRef(id, element);
    },
    [],
  );

  const activateMedia = useCallback(
    (id: string, element: HTMLMediaElement | null) => {
      if (activeElementRef.current && activeElementRef.current !== element) {
        try {
          if (!activeElementRef.current.paused) {
            activeElementRef.current.pause();
          }
        } catch {
          // Ignore pause errors
        }
      }
      activeElementRef.current = element;
      activateMediaRef(id, element);
    },
    [],
  );

  const notifyPaused = useCallback(
    (id: string, element?: HTMLMediaElement | null) => {
      if (element && activeElementRef.current === element) {
        activeElementRef.current = null;
      }
      notifyMediaPaused(id, element);
    },
    [],
  );

  const pauseAll = useCallback((exceptId?: string) => {
    if (!exceptId) {
      activeElementRef.current = null;
    }
    pauseAllMediaRefs(exceptId);
  }, []);

  const value = useMemo<MediaPlaybackContextValue>(
    () => ({
      activeId,
      globalMuted,
      setGlobalMuted,
      globalPlaybackRate,
      setGlobalPlaybackRate,
      registerMedia,
      activateMedia,
      notifyPaused,
      pauseAll,
    }),
    [
      activeId,
      globalMuted,
      globalPlaybackRate,
      registerMedia,
      activateMedia,
      notifyPaused,
      pauseAll,
    ],
  );

  return (
    <MediaPlaybackContext.Provider value={value}>
      {children}
    </MediaPlaybackContext.Provider>
  );
}

/**
 * Access global media state & ref coordination. Safely falls back to the
 * module-level singleton registry if rendered outside `MediaPlaybackProvider`
 * (for example, in isolated component unit tests).
 */
export function useMediaPlayback(): MediaPlaybackContextValue {
  const ctx = useContext(MediaPlaybackContext);
  const [fallbackActiveId, setFallbackActiveId] = useState<string | null>(() =>
    getActiveMediaId(),
  );
  const [fallbackMuted, setFallbackMuted] = useState(false);
  const [fallbackRate, setFallbackRate] = useState(1);

  useEffect(() => {
    if (ctx) return;
    return subscribeActiveMedia((nextId) => {
      setFallbackActiveId(nextId);
    });
  }, [ctx]);

  return useMemo(() => {
    if (ctx) return ctx;
    return {
      activeId: fallbackActiveId,
      globalMuted: fallbackMuted,
      setGlobalMuted: setFallbackMuted,
      globalPlaybackRate: fallbackRate,
      setGlobalPlaybackRate: setFallbackRate,
      registerMedia: registerMediaRef,
      activateMedia: activateMediaRef,
      notifyPaused: notifyMediaPaused,
      pauseAll: pauseAllMediaRefs,
    };
  }, [ctx, fallbackActiveId, fallbackMuted, fallbackRate]);
}
