"use client";

import { AlertTriangle, Globe2, MapPin } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

type Props = Pick<
  OnboardingFlowProps,
  | "formData"
  | "countries"
  | "availableCurrencies"
  | "locationDataError"
  | "locationLoading"
  | "onFieldChange"
  | "onRetryLocation"
>;

export function LocationStep({
  formData,
  countries,
  availableCurrencies,
  locationDataError,
  locationLoading,
  onFieldChange,
  onRetryLocation,
}: Props) {
  return (
    <section>
      <StepHeading
        title={t("onboarding.location.title")}
        description={t("onboarding.location.description")}
        icon={<MapPin className="size-5" />}
      />
      <p className="mb-6 rounded-control bg-surface-sunken p-4 text-caption leading-relaxed text-muted-fg">
        {t("onboarding.location.note")}
      </p>

      {locationDataError ? (
        <ErrorState
          title={t("onboarding.location.error")}
          onRetry={onRetryLocation}
          retryLabel={t("onboarding.location.retry")}
        />
      ) : locationLoading ? (
        <div
          className="flex flex-col gap-4"
          role="status"
          aria-label={t("common.loading")}
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Select
            id="onboarding-country"
            label={t("onboarding.location.country")}
            placeholder={t("onboarding.location.countryPlaceholder")}
            value={formData.country}
            onChange={(event) => onFieldChange("country", event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.id} value={country.code}>
                {country.flag ? `${country.flag} ` : ""}
                {country.name}
              </option>
            ))}
          </Select>
          {formData.country && (
            <p className="flex items-start gap-2 text-caption text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("onboarding.location.countryWarning")}
            </p>
          )}

          {formData.country && (
            <Select
              id="onboarding-currency"
              label={t("onboarding.location.currency")}
              placeholder={t("onboarding.location.currencyPlaceholder")}
              value={formData.currency}
              onChange={(event) => onFieldChange("currency", event.target.value)}
            >
              {availableCurrencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name} ({currency.symbol || ""})
                </option>
              ))}
            </Select>
          )}
          {formData.country && availableCurrencies.length === 0 && !locationLoading && (
            <p className="flex items-start gap-2 text-caption text-muted-fg">
              <Globe2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("onboarding.location.unavailable")}
            </p>
          )}
          {formData.currency && (
            <p className="flex items-start gap-2 text-caption text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("onboarding.location.currencyWarning")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
