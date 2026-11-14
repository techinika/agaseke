import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = t("empty.title"),
  description = t("empty.body"),
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-muted-fg">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </span>
      <h2 className="text-body-lg font-bold text-fg">{title}</h2>
      {description && <p className="max-w-sm text-label text-muted-fg">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
