import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FormField, fieldDescribedBy } from "./FormField";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const textareaClasses = (error?: string) =>
  cn(
    "min-h-28 w-full resize-y rounded-control border bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-danger" : "border-line-strong",
  );

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, containerClassName, className, id, ...props },
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
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(fieldId, hint, error)}
        className={cn(textareaClasses(error), className)}
        {...props}
      />
    </FormField>
  );
});
