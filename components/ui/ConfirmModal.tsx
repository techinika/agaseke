"use client";

import { ConfirmDialog, type ConfirmDialogTone } from "./ConfirmDialog";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "danger" | "warning" | "info";
}

const TONES: Record<NonNullable<ConfirmModalProps["variant"]>, ConfirmDialogTone> = {
  danger: "danger",
  warning: "warning",
  info: "primary",
};

/** @deprecated Use `ConfirmDialog` for new code. */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  loading = false,
  variant = "danger",
}: ConfirmModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={message}
      confirmLabel={confirmText}
      cancelLabel={cancelText}
      loading={loading}
      tone={TONES[variant]}
    />
  );
}
