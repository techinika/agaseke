"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  variant?: "underline" | "segmented";
  className?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
  variant = "underline",
  className,
}: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const handled = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!handled.includes(event.key)) return;
    event.preventDefault();

    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;

    refs.current[next]?.focus();
    onChange(items[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        variant === "underline" &&
          "no-scrollbar flex gap-1 overflow-x-auto border-b border-line",
        variant === "segmented" && "flex gap-1 rounded-pill bg-surface-raised p-1",
        className,
      )}
    >
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative flex min-h-12 shrink-0 items-center justify-center gap-1.5 px-3 text-label font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              variant === "segmented" && "flex-1 rounded-pill",
              active ? "text-fg" : "text-muted-fg hover:text-fg",
              variant === "underline" &&
                active &&
                "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-brand-strong",
              variant === "segmented" && active && "bg-surface shadow-sm",
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-0.5 rounded-pill px-1.5 py-0.5 text-caption font-bold",
                  active
                    ? "bg-brand-strong text-on-brand"
                    : "bg-surface-raised text-muted-fg",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
