import { cn } from "@/lib/cn";

export interface AgasekeMarkProps {
  className?: string;
  tone?: "brand" | "current";
}

/**
 * Rounded-square Agaseke mark featuring the calligraphic lowercase "a".
 * Uses semantic tokens (`text-brand-strong`, `text-on-brand`) by default or
 * `tone="current"` when tinted dynamically (e.g. downloadable creator QR cards).
 */
export function AgasekeMark({
  className,
  tone = "brand",
}: AgasekeMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        rx="24"
        fill="currentColor"
        className={tone === "brand" ? "text-brand-strong" : undefined}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        className="text-on-brand"
        d="M53.8 31.2 C55.4 27.6 59.2 26.8 62.4 29.2 C65.8 31.8 66.4 35.8 63.8 39.8 C60.8 44.4 59.8 49.0 60.0 55.2 C60.2 60.6 61.4 62.2 63.4 62.2 C66.8 62.2 71.2 57.6 74.4 52.0 C75.8 49.6 78.4 50.8 77.6 54.4 C76.0 61.8 69.2 71.0 60.2 72.4 C54.8 73.2 51.8 69.8 50.8 64.2 C46.0 70.4 39.4 73.2 32.4 72.6 C24.4 71.8 21.0 65.4 21.8 56.2 C22.8 44.8 30.4 33.6 41.4 29.8 C46.8 28.0 51.2 29.0 53.8 31.2 Z M52.4 36.2 C44.0 37.6 35.2 45.4 33.0 54.2 C31.8 59.4 35.4 63.4 41.8 62.2 C47.4 61.0 50.6 55.0 51.2 46.8 C51.5 42.6 51.9 39.2 52.4 36.2 Z"
      />
    </svg>
  );
}

export type AgasekeLogoSize = "xs" | "sm" | "md" | "lg";

const LOGO_SIZES: Record<
  AgasekeLogoSize,
  { mark: string; wordmark: string; gap: string }
> = {
  xs: { mark: "size-5", wordmark: "text-label", gap: "gap-1.5" },
  sm: { mark: "size-7", wordmark: "text-body", gap: "gap-2" },
  md: { mark: "size-8", wordmark: "text-title", gap: "gap-2.5" },
  lg: { mark: "size-10", wordmark: "text-heading", gap: "gap-3" },
};

export interface AgasekeLogoProps {
  size?: AgasekeLogoSize;
  subtitle?: string;
  tone?: "brand" | "current";
  className?: string;
}

export function AgasekeLogo({
  size = "md",
  subtitle,
  tone = "brand",
  className,
}: AgasekeLogoProps) {
  const styles = LOGO_SIZES[size];

  return (
    <span className={cn("inline-flex min-w-0 items-center", styles.gap, className)}>
      <AgasekeMark className={styles.mark} tone={tone} />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-display font-extrabold uppercase tracking-tight leading-none",
            tone === "brand" && "text-fg",
            styles.wordmark,
          )}
        >
          AGASEKE
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-caption font-semibold leading-tight text-muted-fg">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
