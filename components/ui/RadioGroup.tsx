import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldMessages, fieldDescribedBy } from "./FormField";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  hint?: string;
  error?: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  options,
  label,
  hint,
  error,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  const generatedId = useId();
  const fieldId = `${name}-${generatedId}`;

  return (
    <fieldset
      id={fieldId}
      aria-invalid={error ? true : undefined}
      aria-describedby={fieldDescribedBy(fieldId, hint, error)}
      className={cn("flex flex-col gap-2", className)}
    >
      {label && <legend className="text-label font-semibold text-fg">{label}</legend>}
      <div
        className={cn(
          "flex gap-3",
          orientation === "vertical" ? "flex-col" : "flex-wrap items-center",
        )}
      >
        {options.map((option) => {
          const optionId = `${fieldId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={() => onValueChange(option.value)}
                className="mt-0.5 size-5 shrink-0 accent-brand-strong outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="min-w-0">
                <label htmlFor={optionId} className="block text-body font-medium text-fg">
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-caption text-muted-fg">{option.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <FieldMessages id={fieldId} hint={hint} error={error} />
    </fieldset>
  );
}
