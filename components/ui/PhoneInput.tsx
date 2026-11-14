"use client";

import { useId } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatRwandaPhone,
  isValidRwandaPhone,
  normalizeRwandaPhone,
} from "@/lib/format/phone";
import { t } from "@/lib/i18n";

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function formatPartial(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function PhoneInput({
  value,
  onChange,
  label = t("support.details.phone"),
  hint = t("support.details.phoneHint"),
  error,
  disabled = false,
  className,
}: PhoneInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const resolvedError =
    error ??
    (value && !isValidRwandaPhone(value) ? t("support.details.invalidPhone") : undefined);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-label font-semibold text-fg">
        {label}
      </label>
      <div className="relative flex items-center">
        <Smartphone
          className="pointer-events-none absolute left-3 size-5 text-muted-fg"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          value={value}
          placeholder="078 000 0000"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
            onChange(formatPartial(digits));
          }}
          onBlur={() => {
            const normalized = normalizeRwandaPhone(value);
            if (normalized) onChange(formatRwandaPhone(normalized));
          }}
          aria-invalid={resolvedError ? true : undefined}
          aria-describedby={
            [hint ? hintId : null, resolvedError ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "min-h-12 w-full rounded-control border bg-surface pl-10 pr-4 text-body text-fg placeholder:text-muted-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            resolvedError ? "border-danger" : "border-line-strong",
          )}
        />
      </div>
      {hint && !resolvedError && (
        <p id={hintId} className="text-caption text-muted-fg">
          {hint}
        </p>
      )}
      {resolvedError && (
        <p id={errorId} role="alert" className="text-caption font-medium text-danger">
          {resolvedError}
        </p>
      )}
    </div>
  );
}
