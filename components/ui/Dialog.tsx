"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { IconButton } from "./IconButton";

export type DialogPlacement = "responsive" | "center" | "bottom" | "right";
export type DialogSize = "sm" | "md" | "lg" | "xl";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  describedBy?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  contentClassName?: string;
  placement?: DialogPlacement;
  size?: DialogSize;
  closeLabel?: string;
  hideCloseButton?: boolean;
  preventClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const PLACEMENT_WRAPPER: Record<DialogPlacement, string> = {
  responsive: "items-end justify-center sm:items-center sm:p-4",
  center: "items-center justify-center p-4",
  bottom: "items-end justify-center",
  right: "items-stretch justify-end",
};

const PLACEMENT_PANEL: Record<DialogPlacement, string> = {
  responsive: "max-h-[92dvh] rounded-t-sheet sm:rounded-sheet",
  center: "max-h-[92dvh] rounded-sheet",
  bottom: "max-h-[92dvh] rounded-t-sheet",
  right: "h-dvh max-h-dvh rounded-none border-l border-line",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  describedBy,
  children,
  footer,
  headerActions,
  className,
  contentClassName,
  placement = "responsive",
  size = "md",
  closeLabel = t("common.close"),
  hideCloseButton = false,
  preventClose = false,
  initialFocusRef,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    preventCloseRef.current = preventClose;
  }, [onClose, preventClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;

    document.body.style.overflow = "hidden";
    (initialFocusRef?.current ?? panel)?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !preventCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const requestClose = () => {
    if (!preventCloseRef.current) onCloseRef.current();
  };

  return (
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 z-[var(--ag-z-sheet)] flex",
        PLACEMENT_WRAPPER[placement],
      )}
    >
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : describedBy}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col bg-surface text-fg shadow-sheet outline-none",
          placement === "right" ? "max-w-md" : SIZE_CLASSES[size],
          PLACEMENT_PANEL[placement],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title font-bold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-label text-muted-fg">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            {!hideCloseButton && (
              <IconButton
                label={closeLabel}
                icon={<X />}
                onClick={requestClose}
                className="-mr-2 -mt-2"
              />
            )}
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto p-5", contentClassName)}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
