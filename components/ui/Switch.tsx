import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-4 rounded-control px-1 py-1 text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-body font-medium text-fg">{label}</span>
        {description && (
          <span className="mt-0.5 block text-caption text-muted-fg">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors",
          checked ? "bg-brand-strong" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
