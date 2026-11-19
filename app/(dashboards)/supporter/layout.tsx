"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LogOut, UserCircle } from "lucide-react";
import AuthGuard from "@/auth/AuthGuard";
import { useAuth } from "@/auth/AuthContext";
import { handleLogout } from "@/db/functions/LogOut";
import ThemeToggle from "@/components/parts/ThemeToggle";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import { IconButton } from "@/components/ui/IconButton";
import { buttonClasses } from "@/components/ui/Button";
import { getNavItems, isNavItemActive, isNavLink } from "@/config/navigation";
import { t } from "@/lib/i18n";

const SUPPORTER_NAV = getNavItems({
  surface: "supporter",
  role: "supporter",
  slot: "desktop",
});

export default function SupporterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { isCreator } = useAuth();
  const activeItem = SUPPORTER_NAV.filter(isNavLink).find((item) =>
    isNavItemActive(item, pathname),
  );
  const pageTitle =
    pathname === "/supporter"
      ? t("supporterLayout.title")
      : activeItem
        ? t(activeItem.labelKey)
        : t("supporterLayout.title");

  return (
    <AuthGuard>
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
                className="inline-flex min-h-11 items-center gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex size-8 items-center justify-center rounded-control bg-brand-strong text-label font-black text-on-brand">
                  A
                </span>
                <span className="min-w-0">
                  <span className="block text-label font-black uppercase tracking-tight text-fg">
                    agaseke.me
                  </span>
                  <span className="block text-caption font-semibold text-muted-fg">
                    {t("supporterLayout.title")}
                  </span>
                </span>
              </Link>
            }
            footer={
              <Link
                href="/"
                className="flex min-h-11 items-center gap-2 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                <Compass className="size-4" aria-hidden="true" />
                {t("supporterLayout.explorePublic")}
              </Link>
            }
          />
        }
        topbar={
          <div className="mx-auto flex h-16 w-full max-w-app items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/supporter"
                className="text-label font-black uppercase tracking-tight text-fg lg:hidden"
              >
                agaseke.me
              </Link>
              <h1 className="truncate text-label font-bold text-fg sm:text-body">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Link
                href={isCreator ? "/creator" : "/onboarding"}
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "hidden sm:inline-flex",
                })}
              >
                {t("nav.workspace")}
              </Link>
              <Link
                href="/profile"
                aria-label={t("nav.accountSettings")}
                title={t("nav.accountSettings")}
                className="inline-flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface-raised hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
              >
                <UserCircle className="size-5" aria-hidden="true" />
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
