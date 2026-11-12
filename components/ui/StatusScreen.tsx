"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Button } from "./Button";

export type StatusKind = "waiting" | "success" | "failed";

interface StatusAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

export interface StatusScreenProps {
  status: StatusKind;
  name?: string;
  title?: string;
  description?: string;
  reference?: string;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  className?: string;
}

export function StatusScreen({
  status,
  name,
  title,
  description,
  reference,
  primaryAction,
  secondaryAction,
  className,
}: StatusScreenProps) {
  const defaults: Record<StatusKind, { title: string; description: string }> = {
    waiting: {
      title: t("support.status.waiting.title"),
      description: t("support.status.waiting.body"),
    },
    success: {
      title: t("support.status.success.title"),
      description: t("support.status.success.body", {
        name: name ?? "the creator",
      }),
    },
    failed: {
      title: t("support.status.failed.title"),
      description: t("support.status.failed.body"),
    },
  };

  const resolved = defaults[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-4 px-2 py-6 text-center", className)}
    >
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-full",
          status === "success" && "bg-success-bg text-success",
          status === "failed" && "bg-danger-bg text-danger",
          status === "waiting" && "bg-surface-raised text-brand-strong",
        )}
      >
        {status === "waiting" && (
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        )}
        {status === "success" && <CheckCircle2 className="size-8" aria-hidden="true" />}
        {status === "failed" && <XCircle className="size-8" aria-hidden="true" />}
      </span>

      <div className="space-y-1">
        <h2 className="text-heading font-bold text-fg">{title ?? resolved.title}</h2>
        <p className="max-w-sm text-label text-muted-fg">
          {description ?? resolved.description}
        </p>
      </div>

      {reference && (
        <p className="rounded-control bg-surface-raised px-3 py-2 font-mono text-caption text-muted-fg">
          {t("support.status.reference")}:{" "}
          <span className="font-semibold text-fg">{reference}</span>
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex w-full flex-col gap-2">
          {primaryAction && (
            <Button
              fullWidth
              onClick={primaryAction.onClick}
              loading={primaryAction.loading}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              fullWidth
              variant="secondary"
              onClick={secondaryAction.onClick}
              loading={secondaryAction.loading}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
