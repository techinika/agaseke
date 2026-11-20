"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Globe,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { AgasekeLogo } from "@/components/brand/AgasekeLogo";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { NotificationBellButton } from "@/components/ui/NotificationBellButton";
import {
  getNavItems,
  isNavItemActive,
  isNavLink,
  type NavLinkItem,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

const NotificationDrawer = dynamic(() => import("@/components/ui/NotificationDrawer"), {
  ssr: false,
});

const SUPPORTER_NAV = getNavItems({
  surface: "supporter",
  role: "supporter",
  slot: "desktop",
});

function SupporterNavDrawerList({
  items,
  onNavigate,
}: {
  items: NavLinkItem[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const sections: Array<{ group?: NavLinkItem["group"]; items: NavLinkItem[] }> = [];

  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) {
      last.items.push(item);
    } else {
      sections.push({ group: item.group, items: [item] });
    }
  }

  return (
    <nav aria-label={t("nav.supporterNavigation")} className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.group ?? `section-${idx}`} className="space-y-1">
          {section.group && (
            <p className="px-3 pt-1 text-caption font-bold uppercase tracking-wider text-muted-fg">
              {t(section.group)}
            </p>
          )}
          {section.items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
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
        </div>
      ))}
    </nav>
  );
}

export function SupporterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, isCreator, isAdmin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = SUPPORTER_NAV.filter(isNavLink);
  const activeItem = navLinks.find((item) => isNavItemActive(item, pathname));
  const pageTitle = activeItem ? t(activeItem.labelKey) : t("supporterLayout.title");

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { subscribeToUnreadNotificationCount } = await import("@/lib/notifications");
      if (cancelled) return;
      unsubscribe = subscribeToUnreadNotificationCount(
        user.uid,
        setUnreadCount,
        (error) => {
          console.error("Failed to load notification count:", error);
          setUnreadCount(0);
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [userMenuOpen]);

  const handleLogoutClick = async () => {
    setUserMenuOpen(false);
    const { handleLogout } = await import("@/db/functions/LogOut");
    await handleLogout();
  };

  const displayName = profile?.displayName || user?.displayName || t("nav.account");
  const firstName = displayName.split(" ")[0] || t("nav.account");
  const effectiveUnreadCount = user?.uid ? unreadCount : 0;

  const sidebarFooter = (
    <div className="space-y-1">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
      >
        <Globe className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t("supporterLayout.explorePublic")}</span>
      </Link>
      <Link
        href="/help-center"
        className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
      >
        <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t("nav.help")}</span>
      </Link>
    </div>
  );

  return (
    <>
      <AppShell
        padded={false}
        width="full"
        bottomNav={<DashboardMobileNav surface="supporter" role="supporter" />}
        sidebar={
          <Sidebar
            items={SUPPORTER_NAV}
            navLabel={t("nav.supporterNavigation")}
            brand={
              <Link
                href="/supporter"
                className="inline-flex min-h-11 items-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <AgasekeLogo size="sm" subtitle={t("supporterLayout.title")} />
              </Link>
            }
            footer={sidebarFooter}
          />
        }
        topbar={
          <div className="mx-auto flex h-16 w-full max-w-app items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                label={t("nav.openMenu")}
                icon={<Menu />}
                variant="ghost"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden"
              />
              <h1 className="truncate text-label font-bold text-fg sm:text-body">
                {pageTitle}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href={isCreator ? "/creator" : "/onboarding"}
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "hidden shrink-0 whitespace-nowrap md:inline-flex",
                })}
              >
                {isCreator ? (
                  <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isCreator
                    ? t("supporterLayout.creatorStudio")
                    : t("supporterLayout.startCreatorPage")}
                </span>
              </Link>

              <NotificationBellButton
                unreadCount={effectiveUnreadCount}
                onClick={() => setShowNotifications(true)}
              />

              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-surface px-1.5 pr-2.5 outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Avatar
                    src={profile?.photoURL || user?.photoURL}
                    name={displayName}
                    size="sm"
                  />
                  <span className="hidden max-w-28 truncate text-label font-semibold text-fg sm:block">
                    {firstName}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-fg transition-transform",
                      userMenuOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-card border border-line bg-surface p-2 shadow-float"
                  >
                    <div className="mb-1 rounded-control bg-surface-raised px-3 py-2">
                      <p className="truncate text-caption font-bold uppercase tracking-wide text-muted-fg">
                        {t("supporterLayout.title")}
                      </p>
                      <p className="truncate text-label font-semibold text-fg">
                        {user?.email || displayName}
                      </p>
                    </div>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                      >
                        <Shield className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t("nav.adminDashboard")}</span>
                      </Link>
                    )}

                    <Link
                      href={isCreator ? "/creator" : "/onboarding"}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                    >
                      {isCreator ? (
                        <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">
                        {isCreator
                          ? t("supporterLayout.creatorStudio")
                          : t("supporterLayout.startCreatorPage")}
                      </span>
                    </Link>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                    >
                      <UserCircle className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t("nav.accountSettings")}</span>
                    </Link>

                    <Link
                      href="/"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                    >
                      <Globe className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{t("supporterLayout.explorePublic")}</span>
                    </Link>

                    <div className="my-2 h-px bg-line" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogoutClick()}
                      className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-label font-semibold text-danger transition-colors hover:bg-danger-bg"
                    >
                      <LogOut className="size-4 shrink-0" aria-hidden="true" />
                      <span>{t("nav.logOut")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      >
        {children}
      </AppShell>

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={t("nav.menu")}
        size="sm"
        contentClassName="p-3"
      >
        <SupporterNavDrawerList
          items={navLinks}
          onNavigate={() => setMobileNavOpen(false)}
        />
        <div className="mt-4 space-y-1 border-t border-line pt-4">
          <Link
            href={isCreator ? "/creator" : "/onboarding"}
            onClick={() => setMobileNavOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-brand-strong transition-colors hover:bg-brand-soft"
          >
            {isCreator ? (
              <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              {isCreator
                ? t("supporterLayout.creatorStudio")
                : t("supporterLayout.startCreatorPage")}
            </span>
          </Link>
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <Globe className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t("supporterLayout.explorePublic")}</span>
          </Link>
          <Link
            href="/help-center"
            onClick={() => setMobileNavOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t("nav.help")}</span>
          </Link>
        </div>
      </Drawer>

      {showNotifications && user?.uid && (
        <NotificationDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          userId={user.uid}
        />
      )}
    </>
  );
}
