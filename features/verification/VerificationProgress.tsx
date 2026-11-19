import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { VerificationFlowProps } from "./types";

type Props = Pick<
  VerificationFlowProps,
  "phoneVerified" | "values" | "idFile" | "status"
>;

export function VerificationProgress({ phoneVerified, values, idFile, status }: Props) {
  const detailsDone = Boolean(
    values.country && values.bankName && values.accountName && values.accountNumber,
  );
  const documentDone = Boolean(idFile) || status === "pending" || status === "approved";
  const steps = [
    { label: t("verification.steps.phone"), done: phoneVerified },
    { label: t("verification.steps.details"), done: detailsDone },
    { label: t("verification.steps.document"), done: documentDone },
  ];
  const current = steps.findIndex((step) => !step.done);
  const active = current === -1 ? steps.length : current + 1;
  const label = t("verification.progress", { current: active, total: steps.length });

  return (
    <div>
      <p className="mb-2 text-caption font-semibold text-muted-fg">{label}</p>
      <ol className="grid grid-cols-3 gap-2" aria-label={label}>
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={index + 1 === active ? "step" : undefined}
            className="flex flex-col gap-2"
          >
            <span
              className={cn(
                "h-2 w-full rounded-pill",
                step.done ? "bg-success" : "bg-surface-sunken",
              )}
              aria-hidden="true"
            />
            <span className="flex items-center gap-1 text-caption text-muted-fg">
              {step.done && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
              <span className={cn(index + 1 === active && "font-semibold text-fg")}>
                {step.label}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
