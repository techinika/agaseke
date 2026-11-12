"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { t } from "@/lib/i18n";

export type ActionSheetStatus = "idle" | "submitting" | "success" | "failed";

export interface SupporterActionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  status: ActionSheetStatus;
  successTitle: string;
  successBody: string;
  failedTitle: string;
  failedBody?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function SupporterActionSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  status,
  successTitle,
  successBody,
  failedTitle,
  failedBody,
  error,
  onRetry,
}: SupporterActionSheetProps) {
  const resolvedFooter = (() => {
    if (status === "success") {
      return (
        <Button fullWidth size="lg" onClick={onClose}>
          {t("common.done")}
        </Button>
      );
    }

    if (status === "failed") {
      return onRetry ? (
        <Button fullWidth size="lg" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null;
    }

    return footer;
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={status === "idle" ? description : undefined}
      footer={resolvedFooter}
      contentClassName="pb-4"
    >
      {status === "success" ? (
        <StatusScreen status="success" title={successTitle} description={successBody} />
      ) : status === "failed" ? (
        <StatusScreen
          status="failed"
          title={failedTitle}
          description={error || failedBody || t("actions.trustNote")}
        />
      ) : (
        <div className="space-y-4">
          {children}
          <p className="text-caption text-muted-fg">{t("actions.trustNote")}</p>
        </div>
      )}
    </Sheet>
  );
}
