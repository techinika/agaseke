"use client";

import { ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

type Props = Pick<OnboardingFlowProps, "formData" | "countries" | "currencies">;

export function ReviewStep({ formData, countries, currencies }: Props) {
  const country = countries.find((entry) => entry.code === formData.country);
  const currency = currencies.find((entry) => entry.code === formData.currency);
  const rows = [
    { label: t("onboarding.review.link"), value: `agaseke.me/${formData.username}` },
    ...(country
      ? [
          {
            label: t("onboarding.review.location"),
            value: `${country.flag ? `${country.flag} ` : ""}${country.name}`,
          },
        ]
      : []),
    ...(currency
      ? [
          {
            label: t("onboarding.review.currency"),
            value: `${currency.code}${currency.symbol ? ` (${currency.symbol})` : ""}`,
          },
        ]
      : []),
    { label: t("onboarding.review.payout"), value: formData.momoNumber },
  ];

  return (
    <section>
      <StepHeading
        title={t("onboarding.review.title")}
        description={t("onboarding.review.description")}
        icon={<ShieldCheck className="size-5" />}
      />
      <dl className="divide-y divide-line rounded-control border border-line bg-surface-sunken">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-fg">
              {row.label}
            </dt>
            <dd className="break-all text-label font-semibold text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
