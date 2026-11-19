import type { ReactNode } from "react";
import ThemeToggle from "@/components/parts/ThemeToggle";
import { t } from "@/lib/i18n";

export interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative min-h-dvh bg-canvas text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--ag-z-sheet)] focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-body focus:font-bold focus:text-fg focus:shadow-float"
      >
        {t("a11y.skipToContent")}
      </a>

      <div className="absolute right-3 top-3 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}
