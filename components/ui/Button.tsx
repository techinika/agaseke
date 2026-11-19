import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const buttonBaseClasses =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-strong text-on-brand hover:bg-brand-hover active:bg-brand-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-raised",
  ghost: "bg-transparent text-fg hover:bg-surface-raised",
  danger: "bg-danger text-white hover:opacity-90",
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-label",
  md: "min-h-12 px-4 text-body",
  lg: "min-h-14 px-5 text-body-lg",
};

export const buttonClasses = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) =>
  cn(
    buttonBaseClasses,
    buttonSizeClasses[size],
    buttonVariantClasses[variant],
    fullWidth && "w-full",
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
