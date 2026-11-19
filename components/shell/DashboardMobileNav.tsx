"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getNavItems,
  isNavItemActive,
  isNavLink,
  type NavFeatureFlags,
  type NavLinkItem,
  type NavRole,
  type NavSurface,
} from "@/config/navigation";
import { BottomNav, type BottomNavItem } from "@/components/ui/BottomNav";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { t, type TranslationKey } from "@/lib/i18n";

export interface DashboardMobileNavProps {
  surface: Extract<NavSurface, "creator" | "supporter" | "admin">;
  role: NavRole;
  features?: NavFeatureFlags;
  className?: string;
}

const ARIA_LABELS: Record<DashboardMobileNavProps["surface"], TranslationKey> = {
  creator: "nav.creatorNavigation",
  supporter: "nav.supporterNavigation",
  admin: "nav.adminNavigation",
};

function groupLinks(items: NavLinkItem[]) {
  const groups = new Map<TranslationKey, NavLinkItem[]>();
  for (const item of items) {
    const group = item.group ?? "nav.moreNavigation";
    const current = groups.get(group) ?? [];
    current.push(item);
    groups.set(group, current);
  }
  return Array.from(groups.entries());
}

export function DashboardMobileNav({
  surface,
  role,
  features,
  className,
}: DashboardMobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const options = { surface, role, slot: "mobile" as const, features };
  const mobileItems = getNavItems(options);
  const moreItems = getNavItems({ ...options, slot: "more" }).filter(isNavLink);
  const groups = groupLinks(moreItems);

  const tabs: BottomNavItem[] = mobileItems.map((item) => {
    const Icon = item.icon;
    if (!isNavLink(item)) {
      return {
        label: t(item.labelKey),
        icon: <Icon className="size-5" aria-hidden="true" />,
        onSelect: () => setMoreOpen(true),
      };
    }
    return {
      href: item.href,
      label: t(item.labelKey),
      icon: <Icon className="size-5" aria-hidden="true" />,
      exact: item.exact,
    };
  });

  return (
    <>
      <BottomNav
        items={tabs}
        ariaLabel={t(ARIA_LABELS[surface])}
        className={cn("lg:hidden", className)}
      />

      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t("nav.moreNavigation")}
        placement="bottom"
        contentClassName="pb-8"
      >
        <div className="space-y-6">
          {groups.map(([groupKey, items]) => (
            <section key={groupKey}>
              <h2 className="mb-2 text-caption font-bold uppercase tracking-wide text-muted-fg">
                {t(groupKey)}
              </h2>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isNavItemActive(item, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-control px-3 text-body font-medium outline-none transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                          active
                            ? "bg-brand-soft text-brand-strong"
                            : "text-fg hover:bg-surface-raised",
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
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}
