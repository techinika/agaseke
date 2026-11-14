"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

export interface CreatorSupportBarProps {
  firstName: string;
  onSupport: () => void;
}

export function CreatorSupportBar({ firstName, onSupport }: CreatorSupportBarProps) {
  const creatorPercent = Math.round(
    (Number(process.env.NEXT_PUBLIC_CREATOR_SHARE) || 0.9) * 100,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-[var(--ag-z-nav)] border-t border-line bg-surface/95 pb-safe backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-fg">
            {t("creator.supportName", { name: firstName })}
          </p>
          <p className="truncate text-caption text-muted-fg">
            {t("creator.supportHint", { percent: creatorPercent })}
          </p>
        </div>
        <Button
          onClick={onSupport}
          leadingIcon={<Heart className="size-4" aria-hidden="true" />}
        >
          {t("creator.support")}
        </Button>
      </div>
    </div>
  );
}
