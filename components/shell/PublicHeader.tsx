"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  getNavItems,
  isNavLink,
  NAV_ITEMS,
  type NavItem,
  type NavLinkItem,
  type NavRole,
} from "@/config/navigation";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";

const NotificationDrawer = dynamic(() => import("@/components/ui/NotificationDrawer"), {
  ssr: false,
});

function currentRole(auth: ReturnType<typeof useAuth>): NavRole {
  if (!auth?.isLoggedIn) return "guest";
  if (auth.isAdmin) return "admin";
  if (auth.isCreator) return "creator";
  return "supporter";
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center text-title font-black uppercase tracking-tight text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      agaseke<span className="text-brand-strong">.me</span>
    </Link>
  );
}

function HeaderLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active?: boolean;
  onNavigate?: () => void;
}) {
  if (!isNavLink(item)) return null;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active
          ? "bg-brand-soft text-brand-strong"
          : "text-muted-fg hover:bg-surface-raised hover:text-fg",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{t(item.labelKey)}</span>
    </Link>
  );
}

function MenuLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  if (!isNavLink(item)) return null;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      onClick={onNavigate}
      className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body font-semibold text-fg outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
      aria-current={
        (item.href === "/explore"
          ? pathname === "/explore"
          : pathname === item.href || pathname.startsWith(`${item.href}/`))
          ? "page"
          : undefined
      }
    >
      <Icon className="size-5 text-muted-fg" aria-hidden="true" />
      {t(item.labelKey)}
    </Link>
  );
}

function DropdownItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg outline-none transition-colors hover:bg-surface-raised hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
    >
      {icon}
      {label}
    </Link>
  );
}

export function PublicHeader() {
  const auth = useAuth();
  const pathname = usePathname();
  const role = currentRole(auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const desktopItems = getNavItems({
    surface: "public",
    role,
    slot: "desktop",
  });
  const mobileItems = [
    ...getNavItems({ surface: "public", role, slot: "mobile" }),
    ...getNavItems({ surface: "public", role, slot: "more" }),
  ].filter((item) => item.id !== "login");
  const signedIn = Boolean(auth?.user && auth?.isLoggedIn);
  const accountItems = [
    "supporter-notices",
    "public-transactions",
    "public-bookings",
    "public-account",
  ]
    .map((id) => NAV_ITEMS.find((item) => item.id === id))
    .filter((item): item is NavLinkItem => Boolean(item && isNavLink(item)));

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

  useEffect(() => {
    const uid = auth?.user?.uid;
    if (!uid) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { subscribeToUnreadNotificationCount } = await import("@/lib/notifications");
      if (cancelled) return;
      unsubscribe = subscribeToUnreadNotificationCount(uid, setUnreadCount, (error) => {
        console.error("Failed to load notification count:", error);
        setUnreadCount(0);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [auth?.user?.uid]);

  const closeMenus = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setLoggingOut(true);
    try {
      const { handleLogout } = await import("@/db/functions/LogOut");
      await handleLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--ag-z-sheet)] focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-body focus:font-bold focus:text-fg focus:shadow-float"
      >
        {t("a11y.skipToContent")}
      </a>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-8">
            <Brand />
            <nav
              aria-label={t("nav.publicNavigation")}
              className="hidden items-center gap-0.5 lg:flex"
            >
              {desktopItems.map((item) => {
                const active =
                  isNavLink(item) &&
                  (item.href === "/explore"
                    ? pathname === "/explore"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`));
                return <HeaderLink key={item.id} item={item} active={active} />;
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            {signedIn ? (
              <>
                <IconButton
                  label={t("nav.notifications")}
                  icon={
                    <span className="relative">
                      <Bell />
                      {unreadCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-pill bg-brand-strong px-1 text-caption font-bold leading-5 text-on-brand">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </span>
                  }
                  onClick={() => setShowNotifications(true)}
                  className="hidden sm:inline-flex"
                />

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    aria-expanded={userMenuOpen}
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-1.5 pr-2.5 outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Avatar
                      src={auth?.profile?.photoURL || auth?.user?.photoURL}
                      name={auth?.profile?.displayName || auth?.user?.displayName}
                      size="sm"
                    />
                    <span className="hidden max-w-28 truncate text-label font-semibold text-fg sm:block">
                      {auth?.profile?.displayName?.split(" ")[0] ||
                        auth?.user?.displayName?.split(" ")[0] ||
                        t("nav.account")}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-fg transition-transform",
                        userMenuOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 rounded-card border border-line bg-surface p-2 shadow-float">
                      <div className="mb-1 rounded-control bg-surface-raised px-3 py-2">
                        <p className="text-caption font-bold uppercase tracking-wide text-muted-fg">
                          {t("nav.personalSpace")}
                        </p>
                        <p className="truncate text-label font-semibold text-fg">
                          {auth?.user?.email}
                        </p>
                      </div>

                      {auth?.isAdmin && (
                        <DropdownItem
                          href="/admin"
                          icon={<LayoutDashboard className="size-4" />}
                          label={t("nav.adminDashboard")}
                          onClick={closeMenus}
                        />
                      )}
                      <DropdownItem
                        href={auth?.isCreator ? "/creator" : "/supporter"}
                        icon={<LayoutDashboard className="size-4" />}
                        label={t("nav.workspace")}
                        onClick={closeMenus}
                      />
                      {accountItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownItem
                            key={item.id}
                            href={item.href}
                            icon={<Icon className="size-4" aria-hidden="true" />}
                            label={t(item.labelKey)}
                            onClick={closeMenus}
                          />
                        );
                      })}

                      <div className="my-2 h-px bg-line" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-label font-semibold text-danger outline-none transition-colors hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
                      >
                        <LogOut className="size-4" aria-hidden="true" />
                        {t("nav.logOut")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={loginHref}
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  {t("nav.login")}
                </Link>
              </div>
            )}

            <IconButton
              label={t("nav.openMenu")}
              icon={<Menu />}
              onClick={() => setMenuOpen(true)}
              className="lg:hidden"
            />
          </div>
        </div>
      </header>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t("nav.menu")}
        contentClassName="p-3"
        footer={
          signedIn ? (
            <Button fullWidth variant="secondary" onClick={closeMenus}>
              {t("common.close")}
            </Button>
          ) : (
            <Link
              href={loginHref}
              onClick={closeMenus}
              className={buttonClasses({
                variant: "primary",
                size: "md",
                fullWidth: true,
              })}
            >
              {t("nav.login")}
            </Link>
          )
        }
      >
        <nav aria-label={t("nav.publicNavigation")} className="space-y-1">
          {mobileItems.map((item) => (
            <MenuLink
              key={item.id}
              item={item}
              pathname={pathname}
              onNavigate={closeMenus}
            />
          ))}
          {signedIn && (
            <>
              <div className="my-2 h-px bg-line" />
              <Link
                href={auth?.isCreator ? "/creator" : "/supporter"}
                onClick={closeMenus}
                className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body font-semibold text-fg hover:bg-surface-raised"
              >
                <LayoutDashboard className="size-5 text-muted-fg" aria-hidden="true" />
                {t("nav.workspace")}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-body font-semibold text-danger hover:bg-danger-bg disabled:opacity-60"
              >
                <LogOut className="size-5" aria-hidden="true" />
                {t("nav.logOut")}
              </button>
            </>
          )}
        </nav>
      </Sheet>

      {auth?.user?.uid && (
        <NotificationDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          userId={auth.user.uid}
        />
      )}
    </>
  );
}
