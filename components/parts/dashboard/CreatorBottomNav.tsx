"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, FileText, Wallet, Users, Settings, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

export interface CreatorBottomNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface CreatorBottomNavProps {
  items: CreatorBottomNavItem[];
  className?: string;
}

export function CreatorBottomNav({ items, className }: CreatorBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.creatorBottomNav")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[var(--ag-z-nav)] border-t border-line bg-surface/95 backdrop-blur pb-safe md:hidden",
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
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-1.5 py-2 text-caption font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                active ? "text-brand-strong" : "text-muted-fg hover:text-fg",
              )}
            >
              <span
                className={cn(
                  "size-10 shrink-0 rounded-full",
                  active
                    ? "bg-brand-strong/10 text-brand-strong"
                    : "bg-surface-raised text-muted-fg",
                )}
              >
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

export const CREATOR_TABS: CreatorBottomNavItem[] = [
  {
    href: "/creator",
    label: t("nav.home"),
    icon: <Home className="size-5" aria-hidden="true" />,
  },
  {
    href: "/creator/content",
    label: t("nav.content"),
    icon: <FileText className="size-5" aria-hidden="true" />,
  },
  {
    href: "/creator/payouts",
    label: t("nav.earnings"),
    icon: <Wallet className="size-5" aria-hidden="true" />,
  },
  {
    href: "/creator/community",
    label: t("nav.community"),
    icon: <Users className="size-5" aria-hidden="true" />,
  },
  {
    href: "/creator/settings",
    label: t("nav.settings"),
    icon: <Settings className="size-5" aria-hidden="true" />,
  },
];

export interface CreatorTopBarProps {
  onShare: () => void;
}

export function CreatorTopBar({ onShare }: CreatorTopBarProps) {
  return (
    <Button
      variant="ghost"
      size="md"
      onClick={onShare}
      leadingIcon={<Share2 className="size-4" aria-hidden="true" />}
      className="-ml-2 justify-start min-h-11"
    >
      {t("creator.shareMyLink")}
    </Button>
  );
}
