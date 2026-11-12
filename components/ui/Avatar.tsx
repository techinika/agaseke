/* eslint-disable @next/next/no-img-element -- avatars come from arbitrary signed URLs */
import { cn } from "@/lib/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, { class: string; pixels: number; text: string }> = {
  sm: { class: "size-8", pixels: 32, text: "text-caption" },
  md: { class: "size-12", pixels: 48, text: "text-body" },
  lg: { class: "size-20", pixels: 80, text: "text-heading" },
  xl: { class: "size-28", pixels: 112, text: "text-display" },
};

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const config = SIZES[size];
  const label = name ? `${name}'s avatar` : "Avatar";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised font-bold text-muted-fg",
        config.class,
        config.text,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          width={config.pixels}
          height={config.pixels}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span aria-label={label} role="img">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
