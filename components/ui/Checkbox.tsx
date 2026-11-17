import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { fieldDescribedBy, fieldErrorId, fieldHintId } from "./FormField";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: ReactNode;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, error, containerClassName, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = fieldDescribedBy(fieldId, description, error);

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "mt-0.5 size-5 shrink-0 rounded border-line-strong accent-brand-strong outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
          {...props}
        />
        {(label || description) && (
          <div className="min-w-0">
            {label && (
              <label htmlFor={fieldId} className="block text-body font-medium text-fg">
                {label}
              </label>
            )}
            {description && !error && (
              <p id={fieldHintId(fieldId)} className="text-caption text-muted-fg">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p
          id={fieldErrorId(fieldId)}
          role="alert"
          className="text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
});
