import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FormFieldProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}

export function fieldHintId(id: string): string {
  return `${id}-hint`;
}

export function fieldErrorId(id: string): string {
  return `${id}-error`;
}

export function fieldDescribedBy(
  id: string,
  hint?: string,
  error?: string,
): string | undefined {
  const ids = [hint ? fieldHintId(id) : undefined, error ? fieldErrorId(id) : undefined];
  return ids.filter(Boolean).join(" ") || undefined;
}

export function FieldMessages({
  id,
  hint,
  error,
}: Pick<FormFieldProps, "id" | "hint" | "error">) {
  if (!hint && !error) return null;

  return (
    <>
      {hint && !error && (
        <p id={fieldHintId(id)} className="text-caption text-muted-fg">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={fieldErrorId(id)}
          role="alert"
          className="text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn("text-label font-semibold text-fg", labelClassName)}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </label>
      )}
      {children}
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}
