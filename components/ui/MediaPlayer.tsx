"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Headphones, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { CustomVideoPlayer } from "@/components/media/CustomVideoPlayer";
import { useMediaPlayback } from "@/components/media/MediaPlaybackContext";
import { MediaImage } from "./MediaImage";

export type MediaKind = "video" | "audio";

export interface MediaPlayerProps {
  src: string;
  kind?: MediaKind;
  poster?: string | null;
  title?: string;
  sizeLabel?: string;
  className?: string;
  allowReelOnMobile?: boolean;
}

export function MediaPlayer({
  src,
  kind = "video",
  poster,
  title,
  sizeLabel,
  className,
  allowReelOnMobile = false,
}: MediaPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const audioId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { registerMedia, activateMedia, notifyPaused, pauseAll } = useMediaPlayback();
  const label = title ?? (kind === "video" ? t("media.video") : t("media.audio"));

  useEffect(() => {
    if (kind !== "audio" || !loaded) return;
    const el = audioRef.current;
    registerMedia(audioId, el);
    return () => {
      registerMedia(audioId, null);
    };
  }, [audioId, kind, loaded, registerMedia]);

  if (loaded) {
    return kind === "video" ? (
      <CustomVideoPlayer
        src={src}
        poster={poster}
        title={label}
        autoPlay
        allowReelOnMobile={allowReelOnMobile}
        className={cn("rounded-card", className)}
      />
    ) : (
      <audio
        ref={audioRef}
        src={src}
        controls
        autoPlay
        preload="metadata"
        onPlay={(e) => activateMedia(audioId, e.currentTarget)}
        onPause={(e) => notifyPaused(audioId, e.currentTarget)}
        onEnded={(e) => notifyPaused(audioId, e.currentTarget)}
        aria-label={label}
        className={cn("w-full", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        pauseAll();
        setLoaded(true);
      }}
      className={cn(
        "group relative flex w-full items-center justify-center overflow-hidden rounded-card bg-fg text-white outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        kind === "video" ? "aspect-video" : "min-h-20 px-4 py-3",
        className,
      )}
    >
      {kind === "video" ? (
        <>
          {poster && (
            <MediaImage
              src={poster}
              alt=""
              className="absolute inset-0 size-full"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          )}
          <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />
        </>
      ) : (
        <span className="absolute inset-0 bg-gradient-to-r from-fg to-fg/80" />
      )}

      <span className="relative flex flex-col items-center gap-1.5">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/95 text-fg shadow-card">
          {kind === "video" ? (
            <Play className="ml-0.5 size-5" aria-hidden="true" />
          ) : (
            <Headphones className="size-5" aria-hidden="true" />
          )}
        </span>
        <span className="text-label font-semibold">{t("media.load")}</span>
        <span className="text-caption text-white/80">{t("media.loadHint")}</span>
      </span>

      {sizeLabel && (
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-caption font-semibold text-white">
          {sizeLabel}
        </span>
      )}

      <span className="sr-only">{label}</span>
    </button>
  );
}
