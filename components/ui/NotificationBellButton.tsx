"use client";

import { Bell } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { ButtonSize, ButtonVariant } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export interface NotificationBellButtonProps {
  unreadCount: number;
  onClick: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function NotificationBellButton({
  unreadCount,
  onClick,
  variant = "ghost",
  size = "md",
  className,
}: NotificationBellButtonProps) {
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  const label =
    unreadCount > 0 ? `${t("nav.notifications")} (${badgeText})` : t("nav.notifications");

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <IconButton
        label={label}
        icon={<Bell />}
        variant={variant}
        size={size}
        onClick={onClick}
      />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 w-max items-center justify-center whitespace-nowrap rounded-pill bg-brand-strong px-1.5 text-caption font-bold leading-none tabular-nums text-on-brand ring-2 ring-surface"
        >
          {badgeText}
        </span>
      )}
    </div>
  );
}
