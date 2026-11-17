"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isNavItemActive, isNavLink, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export interface SidebarProps {
  items: NavItem[];
  brand?: ReactNode;
  footer?: ReactNode;
  navLabel?: string;
  className?: string;
}

export function Sidebar({
  items,
  brand,
  footer,
  navLabel = t("nav.primary"),
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const links = items.filter(isNavLink);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col border-r border-line bg-surface lg:flex",
        className,
      )}
    >
      {brand && <div className="p-5">{brand}</div>}
      <nav aria-label={navLabel} className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {links.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-body font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-muted-fg hover:bg-surface-raised hover:text-fg",
              )}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-brand-strong" : "text-muted-fg",
                )}
                aria-hidden="true"
              />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </aside>
  );
}
