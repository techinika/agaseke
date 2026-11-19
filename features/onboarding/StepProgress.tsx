import { Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { OnboardingStep } from "./types";

const STEPS = [
  { id: 1, key: "link" },
  { id: 2, key: "location" },
  { id: 3, key: "profile" },
  { id: 4, key: "socials" },
  { id: 5, key: "payout" },
  { id: 6, key: "review" },
] as const;

export function StepProgress({ step }: { step: OnboardingStep }) {
  const total = STEPS.length;
  const label = t("onboarding.progress", { current: step, total });

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="text-caption font-semibold text-muted-fg">{label}</p>
        <p className="text-caption font-bold text-brand-strong">
          {t(`onboarding.steps.${STEPS[step - 1].key}`)}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-sunken"
      >
        <div
          className="h-full rounded-pill bg-brand-strong transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${Math.round((step / total) * 100)}%` }}
        />
      </div>
      <ol className="mt-4 hidden grid-cols-6 gap-2 sm:grid">
        {STEPS.map((entry) => {
          const done = step > entry.id;
          const current = step === entry.id;
          return (
            <li key={entry.id} className="flex flex-col items-center gap-1 text-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 items-center justify-center rounded-pill text-caption font-bold",
                  done && "bg-success-bg text-success",
                  current && "bg-brand-strong text-on-brand",
                  !done && !current && "bg-surface-sunken text-muted-fg",
                )}
              >
                {done ? <Check className="size-4" /> : entry.id}
              </span>
              <span
                className={cn(
                  "text-caption",
                  current ? "font-semibold text-fg" : "text-muted-fg",
                )}
                aria-current={current ? "step" : undefined}
              >
                {t(`onboarding.steps.${entry.key}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
