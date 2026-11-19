"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut, Shield } from "lucide-react";
import AuthGuard from "@/auth/AuthGuard";
import { handleLogout } from "@/db/functions/LogOut";
import ThemeToggle from "@/components/parts/ThemeToggle";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import { IconButton } from "@/components/ui/IconButton";
import { getNavItems, isNavItemActive, isNavLink } from "@/config/navigation";
import { t } from "@/lib/i18n";

const ADMIN_NAV = getNavItems({
  surface: "admin",
  role: "admin",
  slot: "desktop",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const links = ADMIN_NAV.filter(isNavLink);
  const activeItem = links.find((item) => isNavItemActive(item, pathname));
  const pageTitle =
    pathname === "/admin"
      ? t("nav.overview")
      : activeItem
        ? t(activeItem.labelKey)
        : (pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ??
          t("nav.admin"));

  return (
    <AuthGuard>
      <AppShell
        padded={false}
        width="full"
        bottomNav={<DashboardMobileNav surface="admin" role="admin" />}
        sidebar={
          <Sidebar
            items={ADMIN_NAV}
            navLabel={t("nav.adminNavigation")}
            brand={
              <Link
                href="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex size-8 items-center justify-center rounded-control bg-brand-strong text-on-brand">
                  <Shield className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-label font-black uppercase tracking-tight text-fg">
                    agaseke.me
                  </span>
                  <span className="block text-caption font-semibold text-muted-fg">
                    {t("nav.admin")}
                  </span>
                </span>
              </Link>
            }
            footer={
              <Link
                href="/creator"
                className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t("adminLayout.backToCreator")}
              </Link>
            }
          />
        }
        topbar={
          <div className="mx-auto flex h-16 w-full max-w-app items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-pill bg-brand-soft px-2 py-1 text-caption font-bold uppercase tracking-wide text-brand-strong">
                {t("nav.admin")}
              </span>
              <h1 className="truncate text-label font-bold capitalize text-fg sm:text-body">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Link
                href="/creator"
                className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("adminLayout.backToCreator")}</span>
              </Link>
              <IconButton
                label={t("nav.logOut")}
                icon={<LogOut />}
                onClick={() => void handleLogout()}
              />
            </div>
          </div>
        }
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
