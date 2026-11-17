"use client";

import { useId, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type ConfirmDialogTone = "danger" | "warning" | "primary";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  loading?: boolean;
  children?: ReactNode;
}

const TONE_CLASSES: Record<ConfirmDialogTone, string> = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  primary: "bg-info-bg text-info",
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = t("common.confirm"),
  cancelLabel = t("common.cancel"),
  tone = "danger",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      describedBy={descriptionId}
      size="sm"
      initialFocusRef={cancelRef}
      preventClose={loading}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}
        >
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p id={descriptionId} className="text-body text-muted-fg">
            {description}
          </p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </Dialog>
  );
}
