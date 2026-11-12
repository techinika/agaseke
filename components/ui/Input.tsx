import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  containerClassName?: string;
}

export const inputClasses = (error?: string) =>
  cn(
    "min-h-12 w-full rounded-control border bg-surface px-4 text-body text-fg placeholder:text-muted-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-danger" : "border-line-strong",
  );

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, containerClassName, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-label font-semibold text-fg">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leading && (
          <span className="pointer-events-none absolute left-3 text-muted-fg">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            inputClasses(error),
            leading ? "pl-10" : undefined,
            trailing ? "pr-10" : undefined,
            className,
          )}
          {...props}
        />
        {trailing && <span className="absolute right-3 text-muted-fg">{trailing}</span>}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-fg">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
