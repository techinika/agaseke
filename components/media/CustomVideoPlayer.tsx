"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useMediaPlayback } from "@/components/media/MediaPlaybackContext";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function subscribeMobileViewport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener?.("change", onStoreChange);
  return () => mq.removeEventListener?.("change", onStoreChange);
}

function getMobileViewportSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(max-width: 767px)").matches;
}

const emptySubscribe = () => () => {};

function getPipSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.pictureInPictureEnabled);
}

export interface CustomVideoPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  creatorName?: string;
  creatorHandle?: string;
  postHref?: string;
  autoPlay?: boolean;
  loop?: boolean;
  preload?: "none" | "metadata" | "auto";
  allowReelOnMobile?: boolean;
  compact?: boolean;
  className?: string;
  onPlay?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onPause?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onEnded?: (e: SyntheticEvent<HTMLVideoElement>) => void;
}

export function CustomVideoPlayer({
  src,
  poster,
  title,
  creatorName,
  creatorHandle,
  postHref,
  autoPlay = false,
  loop,
  preload = "metadata",
  allowReelOnMobile = true,
  compact = false,
  className,
  onPlay,
  onPause,
  onEnded,
}: CustomVideoPlayerProps) {
  const playerId = useId();
  const {
    activeId,
    globalMuted,
    setGlobalMuted,
    globalPlaybackRate,
    setGlobalPlaybackRate,
    registerMedia,
    activateMedia,
    notifyPaused,
  } = useMediaPlayback();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubTrackRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; zone: "left" | "right" | "center" } | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const isMobileViewport = useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );
  const pipSupported = useSyncExternalStore(
    emptySubscribe,
    getPipSnapshot,
    () => false,
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loopOverride, setLoopOverride] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReelOverlayOpen, setIsReelOverlayOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [isDraggingScrub, setIsDraggingScrub] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{
    percent: number;
    time: number;
  } | null>(null);
  const [seekBurst, setSeekBurst] = useState<{
    side: "left" | "right" | "center";
    text: string;
  } | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Detect reel / vertical portrait aspect ratio once metadata loads
  const isReelVideo = useMemo(() => {
    if (!videoDimensions || videoDimensions.width <= 0 || videoDimensions.height <= 0) {
      return false;
    }
    return videoDimensions.height / videoDimensions.width >= 1.15;
  }, [videoDimensions]);

  const isReelMode = allowReelOnMobile && !compact && isReelVideo && isMobileViewport;
  const effectiveLoop = loopOverride ?? loop ?? isReelVideo;

  // Register video element ref globally so starting a new video pauses every other player ref
  useEffect(() => {
    const video = videoRef.current;
    registerMedia(playerId, video);
    return () => {
      registerMedia(playerId, null);
    };
  }, [playerId, registerMedia]);

  // Sync mute & playback rate into the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = globalMuted;
  }, [globalMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = globalPlaybackRate;
  }, [globalPlaybackRate]);

  // Listen to native fullscreen state changes
  useEffect(() => {
    const onFsChange = () => {
      const activeFs = document.fullscreenElement;
      setIsFullscreen(Boolean(activeFs && containerRef.current && activeFs === containerRef.current));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Prevent background page scroll when mobile reel overlay is open
  useEffect(() => {
    if (!isReelOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isReelOverlayOpen]);

  // Clear timers cleanly on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Auto-pause inline feed playback when scrolled mostly offscreen
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const video = videoRef.current;
        if (!video || video.paused) return;
        const inPip =
          typeof document !== "undefined" && document.pictureInPictureElement === video;
        if (!entry.isIntersecting && !isFullscreen && !isReelOverlayOpen && !inPip) {
          try {
            video.pause();
          } catch {
            // Ignore pause errors
          }
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isFullscreen, isReelOverlayOpen]);

  const scheduleControlsHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    if (!isPlaying || isDraggingScrub || speedMenuOpen) return;
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2400);
  }, [isPlaying, isDraggingScrub, speedMenuOpen]);

  useEffect(() => {
    if (!isPlaying && hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, [isPlaying]);

  const flashBurst = useCallback(
    (side: "left" | "right" | "center", text: string) => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      setSeekBurst({ side, text });
      burstTimerRef.current = setTimeout(() => setSeekBurst(null), 650);
    },
    [],
  );

  const togglePlay = useCallback(
    async (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      const video = videoRef.current;
      if (!video) return;
      scheduleControlsHide();

      if (video.paused || video.ended) {
        if (video.ended) {
          video.currentTime = 0;
        }
        activateMedia(playerId, video);
        setHasError(false);
        try {
          await video.play();
        } catch {
          // Browser blocked autoplay or load stalled
        }
      } else {
        video.pause();
        notifyPaused(playerId, video);
      }
    },
    [activateMedia, notifyPaused, playerId, scheduleControlsHide],
  );

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const maxTime = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
      const nextTime = Math.max(0, Math.min(maxTime || 0, video.currentTime + deltaSeconds));
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      setIsEnded(false);
      scheduleControlsHide();
      flashBurst(
        deltaSeconds < 0 ? "left" : "right",
        deltaSeconds < 0 ? `${deltaSeconds}s` : `+${deltaSeconds}s`,
      );
    },
    [duration, flashBurst, scheduleControlsHide],
  );

  const seekToPercent = useCallback(
    (clientX: number) => {
      const track = scrubTrackRef.current;
      const video = videoRef.current;
      if (!track || !video) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const maxTime = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
      if (maxTime > 0) {
        const target = ratio * maxTime;
        video.currentTime = target;
        setCurrentTime(target);
        setIsEnded(false);
      }
    },
    [duration],
  );

  const handleScrubPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDraggingScrub(true);
    seekToPercent(e.clientX);
    scheduleControlsHide();
  };

  const handleScrubPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const track = scrubTrackRef.current;
    if (track) {
      const rect = track.getBoundingClientRect();
      if (rect.width > 0 && duration > 0) {
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPreview({ percent, time: percent * duration });
      }
    }
    if (isDraggingScrub) {
      seekToPercent(e.clientX);
    }
  };

  const handleScrubPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isDraggingScrub) {
      setIsDraggingScrub(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      scheduleControlsHide();
    }
  };

  const toggleMute = useCallback(
    (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      const video = videoRef.current;
      const nextMuted = !globalMuted;
      setGlobalMuted(nextMuted);
      if (video) {
        video.muted = nextMuted;
        if (!nextMuted && video.volume === 0) {
          video.volume = 0.8;
          setVolume(0.8);
        }
      }
      scheduleControlsHide();
    },
    [globalMuted, scheduleControlsHide, setGlobalMuted],
  );

  const handleVolumeChange = (nextVal: number) => {
    const clamped = Math.max(0, Math.min(1, nextVal));
    setVolume(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
    setGlobalMuted(clamped === 0);
    scheduleControlsHide();
  };

  const togglePiP = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || typeof document === "undefined") return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {
      // Ignore PiP rejection
    }
  };

  const toggleFullscreenOrReel = useCallback(
    async (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      scheduleControlsHide();
      // On mobile for reel-sized video, toggle full-screen vertical reel stage
      if (isReelMode) {
        setIsReelOverlayOpen((prev) => !prev);
        return;
      }
      const container = containerRef.current;
      const video = videoRef.current as
        | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        | null;
      if (!container) return;
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } catch {
        if (video?.webkitEnterFullscreen) {
          try {
            video.webkitEnterFullscreen();
          } catch {
            // Ignore Safari fullscreen fallback failure
          }
        }
      }
    },
    [isReelMode, scheduleControlsHide],
  );

  const handleStageTap = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSpeedMenuOpen(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    const zone: "left" | "right" | "center" =
      xRatio < 0.3 ? "left" : xRatio > 0.7 ? "right" : "center";

    // Detect coarse touch double-tap seek on mobile / reel view
    const isCoarsePointer =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (isCoarsePointer || isReelMode) {
      const now = Date.now();
      const prev = lastTapRef.current;
      if (prev && now - prev.time < 280 && prev.zone === zone && zone !== "center") {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        lastTapRef.current = null;
        seekBy(zone === "left" ? -10 : 10);
        return;
      }
      lastTapRef.current = { time: now, zone };
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        void togglePlay();
      }, 220);
      return;
    }

    void togglePlay();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
      if (e.key === " " || e.key === "Enter") return;
    }
    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        void togglePlay();
        break;
      case "arrowleft":
        e.preventDefault();
        seekBy(-5);
        break;
      case "j":
        e.preventDefault();
        seekBy(-10);
        break;
      case "arrowright":
        e.preventDefault();
        seekBy(5);
        break;
      case "l":
        e.preventDefault();
        seekBy(10);
        break;
      case "arrowup":
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
        break;
      case "arrowdown":
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
        e.preventDefault();
        void toggleFullscreenOrReel();
        break;
      case "escape":
        if (isReelOverlayOpen) {
          e.preventDefault();
          setIsReelOverlayOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isReelOverlayOpen) return;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!isReelOverlayOpen || touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY > 90) {
      setIsReelOverlayOpen(false);
    }
  };

  const handleRetry = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    setHasError(false);
    setIsBuffering(true);
    video.load();
    activateMedia(playerId, video);
    void video.play().catch(() => {});
  };

  const playedPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent =
    duration > 0 ? Math.min(100, Math.max(0, (bufferedEnd / duration) * 100)) : 0;

  const showControls =
    controlsVisible || !isPlaying || isEnded || isDraggingScrub || speedMenuOpen;
  const effectiveVolume = globalMuted ? 0 : volume;
  const isThisActive = activeId === playerId;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label={title ? `Video player: ${title}` : "Video player"}
      onMouseMove={scheduleControlsHide}
      onMouseLeave={() => {
        if (isPlaying && !speedMenuOpen && !isDraggingScrub) {
          setControlsVisible(false);
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "group/player relative select-none overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-focus",
        isReelOverlayOpen
          ? "fixed inset-0 z-[120] flex h-dvh w-screen items-center justify-center rounded-none"
          : isReelMode
            ? "mx-auto aspect-[9/16] max-h-[78dvh] w-full max-w-sm rounded-card shadow-card"
            : compact
              ? "w-full rounded-control"
              : "aspect-video w-full rounded-control",
        !isReelOverlayOpen && className,
      )}
      data-player-mode={isReelOverlayOpen ? "reel-fullscreen" : isReelMode ? "reel" : "standard"}
      data-player-active={isThisActive ? "true" : "false"}
    >
      {/* Subtle blurred cinema backdrop when a vertical reel video plays inside a normal desktop 16:9 stage */}
      {!isReelMode && !isReelOverlayOpen && isReelVideo && poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl"
        />
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        playsInline
        autoPlay={autoPlay}
        loop={effectiveLoop}
        muted={globalMuted}
        preload={preload}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
          }
          if (Number.isFinite(v.duration)) {
            setDuration(v.duration);
          }
          v.playbackRate = globalPlaybackRate;
          v.muted = globalMuted;
        }}
        onDurationChange={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrentTime(v.currentTime);
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }
        }}
        onPlay={(e) => {
          activateMedia(playerId, e.currentTarget);
          setIsPlaying(true);
          setIsEnded(false);
          setHasError(false);
          scheduleControlsHide();
          onPlay?.(e);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPause={(e) => {
          setIsPlaying(false);
          setIsBuffering(false);
          setControlsVisible(true);
          notifyPaused(playerId, e.currentTarget);
          onPause?.(e);
        }}
        onEnded={(e) => {
          setIsPlaying(false);
          setIsEnded(true);
          setControlsVisible(true);
          notifyPaused(playerId, e.currentTarget);
          onEnded?.(e);
        }}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setHasError(true);
        }}
        className={cn(
          "relative z-0 size-full transition-opacity duration-200",
          isReelMode || isReelOverlayOpen ? "object-cover" : "object-contain",
        )}
      />

      {/* Interactive Video Stage Hit Surface */}
      <div
        onClick={handleStageTap}
        className="absolute inset-0 z-10 cursor-pointer"
        aria-hidden="true"
      />

      {/* Double-tap / Keyboard Seek Feedback Burst */}
      {seekBurst && (
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/70 px-4 py-2 text-label font-bold text-white backdrop-blur-sm transition-opacity duration-200",
            seekBurst.side === "left" && "left-6",
            seekBurst.side === "right" && "right-6",
            seekBurst.side === "center" && "left-1/2 -translate-x-1/2",
          )}
        >
          {seekBurst.text}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin" aria-label="Buffering video" />
          </span>
        </div>
      )}

      {/* Error State with Working Retry */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
          <AlertCircle className="size-8 text-danger" aria-hidden="true" />
          <p className="text-body font-semibold">Unable to play this video</p>
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-11 rounded-control bg-brand-strong px-4 py-2 text-label font-bold text-on-brand transition hover:opacity-90"
          >
            Retry playback
          </button>
        </div>
      )}

      {/* Center Play / Replay Button when paused or ended */}
      {(!isPlaying || isEnded) && !hasError && !isBuffering && (
        <button
          type="button"
          onClick={(e) => void togglePlay(e)}
          aria-label={isEnded ? "Replay video" : "Play video"}
          className="absolute left-1/2 top-1/2 z-20 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-fg shadow-card transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-focus"
        >
          {isEnded ? (
            <RotateCcw className="size-6" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Top Scrim Header for Reel Mode (Inline or Fullscreen Reel) */}
      {(isReelMode || isReelOverlayOpen) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 pt-3 pb-8 transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex items-center gap-2 text-caption font-semibold text-white/90">
            <span>Reel</span>
            {duration > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatMediaTime(duration)}</span>
              </>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => toggleMute(e)}
              aria-label={globalMuted ? "Unmute video" : "Mute video"}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              {globalMuted ? (
                <VolumeX className="size-4" aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => void toggleFullscreenOrReel(e)}
              aria-label={isReelOverlayOpen ? "Close fullscreen reel" : "Open fullscreen reel"}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              {isReelOverlayOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Reel Vertical Thumb Action Rail */}
      {(isReelMode || isReelOverlayOpen) && (
        <div
          className={cn(
            "absolute bottom-24 right-2.5 z-20 flex flex-col items-center gap-2 transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextIdx =
                (PLAYBACK_RATES.indexOf(globalPlaybackRate as (typeof PLAYBACK_RATES)[number]) + 1) %
                PLAYBACK_RATES.length;
              setGlobalPlaybackRate(PLAYBACK_RATES[nextIdx]);
              scheduleControlsHide();
            }}
            aria-label={`Playback speed ${globalPlaybackRate}x`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/55 px-2 text-caption font-bold tabular-nums text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            {globalPlaybackRate}x
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLoopOverride(!effectiveLoop);
              scheduleControlsHide();
            }}
            aria-label={effectiveLoop ? "Disable loop" : "Enable loop"}
            aria-pressed={effectiveLoop}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-full backdrop-blur-sm transition",
              effectiveLoop
                ? "bg-brand-strong text-on-brand"
                : "bg-black/55 text-white hover:bg-black/80",
            )}
          >
            <Repeat className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom Scrim & Custom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-200",
          showControls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Reel Metadata Caption inside Mobile Reel HUD */}
        {(isReelMode || isReelOverlayOpen) && (creatorName || title) && (
          <div className="mb-2.5 pr-12 text-white">
            {creatorName && (
              <p className="text-caption font-bold text-white/95">
                {creatorName}
                {creatorHandle && (
                  <span className="ml-1.5 font-normal text-white/75">
                    @{creatorHandle}
                  </span>
                )}
              </p>
            )}
            {title && (
              <p className="mt-0.5 line-clamp-2 text-label font-medium text-white/90">
                {title}
              </p>
            )}
            {isReelOverlayOpen && postHref && (
              <Link
                href={postHref}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReelOverlayOpen(false);
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-brand-soft hover:underline"
              >
                Open post <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {/* Custom Scrub & Buffer Bar */}
        <div
          ref={scrubTrackRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
          onPointerDown={handleScrubPointerDown}
          onPointerMove={handleScrubPointerMove}
          onPointerUp={handleScrubPointerUp}
          onPointerLeave={() => setHoverPreview(null)}
          className="group/scrub relative flex h-6 w-full cursor-pointer items-center touch-none"
        >
          {hoverPreview && !isReelMode && (
            <span
              style={{ left: `${hoverPreview.percent * 100}%` }}
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-caption font-semibold tabular-nums text-white"
            >
              {formatMediaTime(hoverPreview.time)}
            </span>
          )}
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/scrub:h-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-white/40"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-brand-strong"
              style={{ width: `${playedPercent}%` }}
            />
          </div>
          <span
            style={{ left: `${playedPercent}%` }}
            className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-white shadow transition-transform group-hover/scrub:scale-110"
          />
        </div>

        {/* Control Row */}
        <div className="mt-0.5 flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => void togglePlay(e)}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-control text-white transition hover:bg-white/15"
            >
              {isPlaying ? (
                <Pause className="size-4 fill-current" aria-hidden="true" />
              ) : (
                <Play className="size-4 fill-current" aria-hidden="true" />
              )}
            </button>

            {!isReelMode && !compact && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seekBy(-10);
                  }}
                  aria-label="Rewind 10 seconds"
                  title="Rewind 10s (J)"
                  className="hidden min-h-10 min-w-10 items-center justify-center rounded-control text-white transition hover:bg-white/15 sm:flex"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seekBy(10);
                  }}
                  aria-label="Forward 10 seconds"
                  title="Forward 10s (L)"
                  className="hidden min-h-10 min-w-10 items-center justify-center rounded-control text-white transition hover:bg-white/15 sm:flex"
                >
                  <RotateCw className="size-4" aria-hidden="true" />
                </button>
              </>
            )}

            {/* Desktop Mute & Expandable Volume Slider */}
            {!isReelMode && (
              <div className="group/vol flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => toggleMute(e)}
                  aria-label={globalMuted ? "Unmute video" : "Mute video"}
                  title="Mute (M)"
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-control text-white transition hover:bg-white/15"
                >
                  {effectiveVolume === 0 ? (
                    <VolumeX className="size-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="size-4" aria-hidden="true" />
                  )}
                </button>
                {!compact && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={effectiveVolume}
                    aria-label="Volume"
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="hidden w-0 cursor-pointer accent-brand-strong opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 focus:w-16 focus:opacity-100 md:block"
                  />
                )}
              </div>
            )}

            <span className="ml-1 whitespace-nowrap text-caption font-medium tabular-nums text-white/90">
              {formatMediaTime(currentTime)}
              {duration > 0 ? ` / ${formatMediaTime(duration)}` : ""}
            </span>
          </div>

          {/* Right Action Controls */}
          {!isReelMode && (
            <div className="relative flex items-center gap-1">
              {!compact && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoopOverride(!effectiveLoop);
                    scheduleControlsHide();
                  }}
                  aria-label={effectiveLoop ? "Disable loop" : "Enable loop"}
                  aria-pressed={effectiveLoop}
                  title="Loop video"
                  className={cn(
                    "hidden min-h-10 min-w-10 items-center justify-center rounded-control transition sm:flex",
                    effectiveLoop
                      ? "bg-white/20 text-brand-soft"
                      : "text-white/85 hover:bg-white/15 hover:text-white",
                  )}
                >
                  <Repeat className="size-4" aria-hidden="true" />
                </button>
              )}

              {/* Playback Speed Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeedMenuOpen((prev) => !prev);
                    scheduleControlsHide();
                  }}
                  aria-label="Playback speed"
                  aria-expanded={speedMenuOpen}
                  className="flex min-h-10 items-center justify-center whitespace-nowrap rounded-control px-2 text-caption font-bold tabular-nums text-white transition hover:bg-white/15"
                >
                  {globalPlaybackRate}x
                </button>
                {speedMenuOpen && (
                  <div className="absolute bottom-11 right-0 z-30 flex flex-col overflow-hidden rounded-control border border-white/15 bg-black/90 p-1 shadow-card backdrop-blur-md">
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGlobalPlaybackRate(rate);
                          setSpeedMenuOpen(false);
                        }}
                        className={cn(
                          "whitespace-nowrap rounded px-3 py-1.5 text-left text-caption font-semibold tabular-nums transition",
                          globalPlaybackRate === rate
                            ? "bg-brand-strong text-on-brand"
                            : "text-white/85 hover:bg-white/15",
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {pipSupported && !compact && (
                <button
                  type="button"
                  onClick={(e) => void togglePiP(e)}
                  aria-label="Picture in picture"
                  title="Picture in Picture"
                  className="hidden min-h-10 min-w-10 items-center justify-center rounded-control text-white/85 transition hover:bg-white/15 hover:text-white sm:flex"
                >
                  <PictureInPicture2 className="size-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => void toggleFullscreenOrReel(e)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                title="Fullscreen (F)"
                className="flex min-h-10 min-w-10 items-center justify-center rounded-control text-white transition hover:bg-white/15"
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
