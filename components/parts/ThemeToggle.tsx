"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { t } from "@/lib/i18n";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface-raised hover:text-fg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      aria-label={t("a11y.toggleTheme")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-[18px]" aria-hidden="true" />
      ) : (
        <Moon className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
