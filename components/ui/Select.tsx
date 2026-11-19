import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { FormField, fieldDescribedBy } from "./FormField";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  containerClassName?: string;
}

export const selectClasses = (error?: string) =>
  cn(
    "min-h-12 w-full appearance-none rounded-control border bg-surface py-2 pl-4 pr-10 text-body text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-danger" : "border-line-strong",
  );

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    placeholder,
    containerClassName,
    className,
    id,
    children,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(fieldId, hint, error)}
          className={cn(selectClasses(error), className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg"
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
});
