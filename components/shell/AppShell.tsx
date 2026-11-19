import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export type AppShellWidth = "default" | "wide" | "full";

export interface AppShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  topbar?: ReactNode;
  bottomNav?: ReactNode;
  width?: AppShellWidth;
  padded?: boolean;
  className?: string;
  mainClassName?: string;
}

const WIDTH_CLASSES: Record<AppShellWidth, string> = {
  default: "max-w-6xl",
  wide: "max-w-app",
  full: "max-w-none",
};

export function AppShell({
  children,
  sidebar,
  topbar,
  bottomNav,
  width = "default",
  padded = true,
  className,
  mainClassName,
}: AppShellProps) {
  return (
    <div className={cn("min-h-dvh bg-canvas text-fg", className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--ag-z-sheet)] focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-body focus:font-bold focus:text-fg focus:shadow-float"
      >
        {t("a11y.skipToContent")}
      </a>

      <div className="flex min-h-dvh">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {topbar && (
            <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
              {topbar}
            </header>
          )}
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              "flex-1 outline-none",
              padded && "px-4 py-6 sm:px-6 lg:px-8",
              bottomNav ? "pb-24 lg:pb-8" : undefined,
              mainClassName,
            )}
          >
            <div className={cn("mx-auto w-full", WIDTH_CLASSES[width])}>{children}</div>
          </main>
        </div>
      </div>

      {bottomNav}
    </div>
  );
}
