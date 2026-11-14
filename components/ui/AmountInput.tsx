"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { formatNumber, parseMoneyInput } from "@/lib/format/money";
import { t } from "@/lib/i18n";

export interface AmountInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  presets?: number[];
  currency?: string;
  min?: number;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function AmountInput({
  value,
  onChange,
  presets = [500, 1000, 2000, 5000],
  currency = "RWF",
  min = 100,
  label,
  hint,
  error,
  disabled = false,
  className,
}: AmountInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const invalid =
    value !== "" && value > 0 && value < min
      ? t("support.amount.invalid", { min })
      : undefined;
  const resolvedError = error ?? invalid;
  const describedBy =
    [hint ? hintId : null, resolvedError ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && (
        <label htmlFor={inputId} className="text-label font-semibold text-fg">
          {label}
        </label>
      )}

      <div
        role="group"
        aria-label={t("support.amount.title")}
        className="grid grid-cols-4 gap-2"
      >
        {presets.map((preset) => {
          const active = value === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                "min-h-12 rounded-control border px-2 text-label font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50",
                active
                  ? "border-brand-strong bg-brand-strong text-on-brand"
                  : "border-line-strong bg-surface text-fg hover:bg-surface-raised",
              )}
            >
              {formatNumber(preset)}
            </button>
          );
        })}
      </div>

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={value === "" ? "" : formatNumber(value)}
          onChange={(event) => {
            const parsed = parseMoneyInput(event.target.value);
            onChange(parsed > 0 ? parsed : "");
          }}
          aria-invalid={resolvedError ? true : undefined}
          aria-describedby={describedBy}
          placeholder={t("support.amount.custom")}
          className={cn(
            "min-h-14 w-full rounded-control border bg-surface px-4 pr-16 text-title font-semibold text-fg placeholder:text-body placeholder:font-normal placeholder:text-muted-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            resolvedError ? "border-danger" : "border-line-strong",
          )}
        />
        <span className="pointer-events-none absolute right-4 text-label font-semibold text-muted-fg">
          {currency}
        </span>
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
