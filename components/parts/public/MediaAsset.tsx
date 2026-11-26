"use client";

import type {
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  VideoHTMLAttributes,
} from "react";
import { CustomVideoPlayer } from "@/components/media/CustomVideoPlayer";
import { usePostMediaSrc } from "@/lib/usePostMediaSrc";

type BaseProps = {
  postId: string;
  isPrivate: boolean;
  url: string | null | undefined;
};

type ImgProps = BaseProps & { as?: "img" } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;
type VideoProps = BaseProps & {
  as: "video";
  poster?: string | null;
  title?: string;
  creatorName?: string;
  creatorHandle?: string;
  postHref?: string;
  allowReelOnMobile?: boolean;
  compact?: boolean;
  nativeControls?: boolean;
} & Omit<VideoHTMLAttributes<HTMLVideoElement>, "src">;

/**
 * Renders post media without ever putting a bare asset URL for private content
 * in the DOM: the source is resolved through the signed proxy, and the element
 * is skipped while access is unresolved or denied.
 */
export function MediaAsset(props: ImgProps | VideoProps) {
  const { postId, isPrivate, url, as, ...rest } = props;
  const { mediaSrc } = usePostMediaSrc(postId, isPrivate);
  const src = mediaSrc(url);

  if (!src) return null;

  if (as === "video") {
    const {
      poster,
      title,
      creatorName,
      creatorHandle,
      postHref,
      allowReelOnMobile = true,
      compact = false,
      nativeControls = false,
      autoPlay,
      loop,
      preload,
      className,
      onPlay,
      onPause,
      onEnded,
      // Omit native <video> flags already handled by CustomVideoPlayer
      controls: _controls,
      controlsList: _controlsList,
      ...videoRest
    } = rest as Omit<VideoProps, keyof BaseProps | "as">;

    void _controls;
    void _controlsList;

    if (nativeControls) {
      return (
        <video
          src={src}
          poster={poster || undefined}
          controls
          playsInline
          autoPlay={autoPlay}
          loop={loop}
          preload={preload}
          className={className}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          {...videoRest}
        />
      );
    }

    const resolvedPoster = poster ? mediaSrc(poster) ?? undefined : undefined;

    return (
      <CustomVideoPlayer
        src={src}
        poster={resolvedPoster}
        title={title}
        creatorName={creatorName}
        creatorHandle={creatorHandle}
        postHref={postHref}
        autoPlay={Boolean(autoPlay)}
        loop={loop}
        preload={
          preload === "none" || preload === "auto" || preload === "metadata"
            ? preload
            : "metadata"
        }
        allowReelOnMobile={allowReelOnMobile}
        compact={compact}
        className={className}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      />
    );
  }

  const { alt, ...imgProps } = rest as ImgHTMLAttributes<HTMLImageElement>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} {...imgProps} />;
}

type LinkProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
    fallback?: ReactNode;
  };

/** Render an anchor only once the media URL has been resolved for this viewer. */
export function MediaLink({
  postId,
  isPrivate,
  url,
  children,
  fallback = null,
  ...rest
}: LinkProps) {
  const { mediaSrc } = usePostMediaSrc(postId, isPrivate);
  const href = mediaSrc(url);
  if (!href) return <>{fallback}</>;
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
