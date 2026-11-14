"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MediaImage } from "@/components/ui/MediaImage";
import { MediaPlayer } from "@/components/ui/MediaPlayer";
import { Money } from "@/components/ui/Money";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import type { PostCardProps } from "../types";

function postDate(createdAt?: unknown): string {
  if (!createdAt) return "";
  let ms: number | null = null;
  if (typeof createdAt === "object" && createdAt !== null) {
    const toMillis = (createdAt as Record<string, unknown>).toMillis;
    if (typeof toMillis === "function") {
      ms = Number(toMillis.call(createdAt));
    }
  } else if (typeof createdAt === "string") {
    ms = Date.parse(createdAt);
  } else if (createdAt instanceof Date) {
    ms = createdAt.getTime();
  }
  if (!ms || !Number.isFinite(ms)) return "";
  try {
    return formatDistanceToNowStrict(new Date(ms), { addSuffix: true });
  } catch {
    return "";
  }
}

export function PostCard({ post, onOpen, onLike, onShare }: PostCardProps) {
  const hasMedia =
    post.type === "image" ||
    post.type === "video" ||
    post.type === "article" ||
    (post.type === "document" && post.contentUrl);

  return (
    <Card className="p-4">
      {hasMedia && (
        <div
          className="relative aspect-[16/9] overflow-hidden rounded-card bg-surface-raised mb-3 cursor-pointer"
          onClick={() => onOpen?.(post.id)}
        >
          {post.type === "video" && post.contentUrl ? (
            <MediaPlayer
              src={post.contentUrl}
              kind="video"
              poster={post.coverUrl ?? undefined}
              title={post.title ?? undefined}
              sizeLabel={
                post.price != null ? formatMoney(post.price, post.currency) : undefined
              }
              className="size-full"
            />
          ) : (
            <MediaImage
              src={post.coverUrl ?? post.contentUrl ?? undefined}
              alt={post.title ?? t("content.postMediaAlt")}
              aspectRatio="16 / 9"
              sizes="(max-width: 768px) 100vw, 640px"
              className="size-full"
            />
          )}
          <Badge tone="brand" className="absolute top-3 left-3 z-10">
            {post.type === "video" ? t("media.video") : t("media.image")}
          </Badge>
          {post.price != null && (
            <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-caption font-semibold text-white">
              <Money value={post.price} currency={post.currency} />
            </span>
          )}
        </div>
      )}

      {post.title && (
        <h3
          className="font-bold text-body-lg text-fg mb-1 leading-snug cursor-pointer"
          onClick={() => onOpen?.(post.id)}
        >
          {post.title}
        </h3>
      )}
      {post.description && (
        <p className="text-body text-muted-fg mb-3 line-clamp-2 leading-relaxed">
          {post.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
        <div className="flex items-center gap-1 text-label text-muted-fg">
          {post.createdAt != null ? <span>{postDate(post.createdAt)}</span> : null}
          {post.views != null && (
            <span className="ml-2">
              {String(post.views)} {t("content.views")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike?.(post.id)}
            aria-label={t("content.likeAria")}
            className="min-h-10 min-w-10 p-2"
          >
            <Heart className="size-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(post.id)}
            aria-label={t("content.shareAria")}
            className="min-h-10 min-w-10 p-2"
          >
            <Share2 className="size-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("content.saveAria")}
            className="min-h-10 min-w-10 p-2"
          >
            <Bookmark className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
