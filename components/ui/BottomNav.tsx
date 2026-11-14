"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  ariaLabel?: string;
  className?: string;
}

export function BottomNav({ items, ariaLabel = "Primary", className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[var(--ag-z-nav)] border-t border-line bg-surface/95 pb-safe backdrop-blur",
        className,
      )}
    >
      <div
        className="mx-auto grid max-w-lg"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const exact = item.exact ?? item.href === "/";
          const active = exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 text-caption font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                active ? "text-brand-strong" : "text-muted-fg hover:text-fg",
              )}
            >
              <span aria-hidden="true" className="[&>svg]:size-5">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
