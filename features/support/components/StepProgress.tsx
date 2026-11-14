"use client";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { SupportStep } from "../types";

const STEPS: { id: SupportStep; label: string }[] = [
  { id: "amount", label: t("support.step.amount") },
  { id: "pay", label: t("support.step.pay") },
  { id: "status", label: t("support.step.status") },
];

export function StepProgress({ step }: { step: SupportStep }) {
  const activeIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <ol className="mb-4 flex items-center gap-2" aria-label={t("support.step.amount")}>
      {STEPS.map((item, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <li
            key={item.id}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                active && "bg-brand-strong text-on-brand",
                done && "bg-success-bg text-success",
                !active && !done && "bg-surface-raised text-muted-fg",
              )}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "truncate text-caption font-semibold",
                active ? "text-fg" : "text-muted-fg",
              )}
            >
              {item.label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px min-w-2 flex-1",
                  done ? "bg-success" : "bg-line-strong",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
