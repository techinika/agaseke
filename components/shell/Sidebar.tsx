"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { isNavItemActive, isNavLink, type NavItem } from "@/config/navigation";
import { AgasekeMark } from "@/components/brand/AgasekeLogo";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export interface SidebarProps {
  items: NavItem[];
  brand?: ReactNode;
  footer?: ReactNode;
  navLabel?: string;
  collapsible?: boolean;
  className?: string;
}

export function Sidebar({
  items,
  brand,
  footer,
  navLabel = t("nav.primary"),
  collapsible = true,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const links = items.filter(isNavLink);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-sidebar",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          collapsed ? "justify-center p-2" : "justify-between p-5",
        )}
      >
        {collapsed ? (
          <AgasekeMark className="size-8 shrink-0" />
        ) : (
          <div className="min-w-0 flex-1">{brand}</div>
        )}
        {collapsible && (
          <IconButton
            size="sm"
            label={t(collapsed ? "nav.expandSidebar" : "nav.collapseSidebar")}
            icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          />
        )}
      </div>

      <nav
        aria-label={navLabel}
        className={cn(
          "flex-1 overflow-y-auto pb-4",
          collapsed ? "space-y-1 px-2" : "space-y-4 px-3",
        )}
      >
        {(() => {
          const sections: Array<{ group?: NavItem["group"]; items: typeof links }> = [];
          for (const item of links) {
            const last = sections[sections.length - 1];
            if (last && last.group === item.group) {
              last.items.push(item);
            } else {
              sections.push({ group: item.group, items: [item] });
            }
          }

          return sections.map((section, sectionIdx) => (
            <div key={section.group ?? `section-${sectionIdx}`} className="space-y-1">
              {section.group &&
                (collapsed ? (
                  <div className="my-2 h-px bg-line" aria-hidden="true" />
                ) : (
                  <p className="px-3 pt-1 text-caption font-bold uppercase tracking-wider text-muted-fg">
                    {t(section.group)}
                  </p>
                ))}
              {section.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                const label = t(item.labelKey);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-label font-semibold outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      collapsed && "justify-center px-0",
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
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          ));
        })()}
      </nav>

      {footer && !collapsed && <div className="border-t border-line p-3">{footer}</div>}
    </aside>
  );
}
