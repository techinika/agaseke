"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = t("error.title"),
  description = t("error.body"),
  onRetry,
  retryLabel = t("error.retry"),
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-body-lg font-bold text-fg">{title}</h2>
      <p className="max-w-sm text-label text-muted-fg">{description}</p>
      {action}
      {onRetry && !action && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
