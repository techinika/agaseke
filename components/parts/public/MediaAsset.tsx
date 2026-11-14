"use client";

import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode, VideoHTMLAttributes } from "react";
import { usePostMediaSrc } from "@/lib/usePostMediaSrc";

type BaseProps = {
  postId: string;
  isPrivate: boolean;
  url: string | null | undefined;
};

type ImgProps = BaseProps & { as?: "img" } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;
type VideoProps = BaseProps & { as: "video" } & Omit<VideoHTMLAttributes<HTMLVideoElement>, "src">;

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
    return <video src={src} {...(rest as VideoHTMLAttributes<HTMLVideoElement>)} />;
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
