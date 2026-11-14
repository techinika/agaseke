import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export interface TopBarProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
  headingLevel?: "h1" | "h2";
}

export function TopBar({
  title,
  backHref,
  actions,
  className,
  headingLevel: Heading = "h1",
}: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--ag-z-nav)] flex min-h-14 items-center gap-1 border-b border-line bg-surface/95 px-2 pt-safe backdrop-blur",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label={t("common.back")}
          className="flex size-12 shrink-0 items-center justify-center rounded-control text-fg outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
      )}
      <Heading className="min-w-0 truncate text-title font-bold text-fg">{title}</Heading>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </header>
  );
}
