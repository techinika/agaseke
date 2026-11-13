"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MediaImage } from "@/components/ui/MediaImage";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import type { LockedPostCardProps } from "../types";

export function LockedPostCard({ post, onUnlock }: LockedPostCardProps) {
  const price = post.price != null ? formatMoney(post.price, post.currency) : null;

  return (
    <Card className="p-4">
      <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-surface-raised mb-3">
        <MediaImage
          src=""
          alt={t("content.lockedAlt")}
          aspectRatio="16 / 9"
          sizes="(max-width: 768px) 100vw, 640px"
          className="size-full"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Lock className="size-10 text-white" aria-hidden="true" />
        </div>
        <Badge tone="info" className="absolute top-3 left-3 z-10">
          {t("content.supportersOnly")}
        </Badge>
      </div>

      {post.title && (
        <h3 className="font-bold text-body-lg text-fg mb-1">{post.title}</h3>
      )}
      {post.description && (
        <p className="text-label text-muted-fg mb-3 line-clamp-2">{post.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        {price && (
          <span className="text-label font-semibold text-fg">
            {t("content.price", { amount: price })}
          </span>
        )}
        <Button fullWidth size="lg" variant="primary" onClick={onUnlock}>
          {t("content.supportToUnlock")}
        </Button>
      </div>
    </Card>
  );
}
