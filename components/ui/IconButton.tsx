import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buttonBaseClasses,
  buttonVariantClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./Button";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "size-11",
  md: "size-12",
  lg: "size-14",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      variant = "ghost",
      size = "md",
      loading = false,
      className,
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
        aria-label={label}
        title={label}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          buttonBaseClasses,
          buttonVariantClasses[variant],
          SIZE_CLASSES[size],
          "shrink-0 p-0",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true" className="[&>svg]:size-5">
            {icon}
          </span>
        )}
      </button>
    );
  },
);
