"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { t } from "@/lib/i18n";

export type ActionSheetStatus = "idle" | "submitting" | "waiting" | "success" | "failed";

interface ActionSheetAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

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
  waitingTitle?: string;
  waitingBody?: string;
  waitingReference?: string;
  waitingPrimaryAction?: ActionSheetAction;
  waitingSecondaryAction?: ActionSheetAction;
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
  waitingTitle,
  waitingBody,
  waitingReference,
  waitingPrimaryAction,
  waitingSecondaryAction,
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

    if (status === "waiting") return null;

    return footer;
  })();

  const showStatusScreen =
    status === "success" || status === "failed" || status === "waiting";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={status === "idle" ? description : undefined}
      footer={showStatusScreen ? resolvedFooter : footer}
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
      ) : status === "waiting" ? (
        <StatusScreen
          status="waiting"
          title={waitingTitle}
          description={waitingBody || t("actions.trustNote")}
          reference={waitingReference ?? undefined}
          primaryAction={waitingPrimaryAction}
          secondaryAction={waitingSecondaryAction}
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
