"use client";

import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { t } from "@/lib/i18n";
import { ClaimLinkStep } from "./steps/ClaimLinkStep";
import { LocationStep } from "./steps/LocationStep";
import { PayoutStep } from "./steps/PayoutStep";
import { ProfileStep } from "./steps/ProfileStep";
import { ReviewStep } from "./steps/ReviewStep";
import { SocialsStep } from "./steps/SocialsStep";
import { StepProgress } from "./StepProgress";
import type { OnboardingFlowProps } from "./types";

export function OnboardingFlow({
  step,
  formData,
  usernameStatus,
  countries,
  currencies,
  availableCurrencies,
  locationDataError,
  locationLoading,
  loading,
  onFieldChange,
  onSocialChange,
  onNext,
  onBack,
  onFinish,
  onSkip,
  onRetryLocation,
}: OnboardingFlowProps) {
  const isReview = step === 6;
  const canContinue =
    step === 1
      ? usernameStatus === "available"
      : step === 3
        ? formData.fullName.trim().length > 0
        : step === 5
          ? formData.momoNumber.trim().length > 0
          : true;

  return (
    <div className="min-h-dvh bg-canvas px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="sr-only">{t("onboarding.title")}</h1>
      <div className="mx-auto w-full max-w-xl">
        <StepProgress step={step} />
        <Card className="mt-5">
          <div className="p-5 sm:p-8">
            {step === 1 && (
              <ClaimLinkStep
                username={formData.username}
                usernameStatus={usernameStatus}
                onFieldChange={onFieldChange}
              />
            )}
            {step === 2 && (
              <LocationStep
                formData={formData}
                countries={countries}
                availableCurrencies={availableCurrencies}
                locationDataError={locationDataError}
                locationLoading={locationLoading}
                onFieldChange={onFieldChange}
                onRetryLocation={onRetryLocation}
              />
            )}
            {step === 3 && (
              <ProfileStep formData={formData} onFieldChange={onFieldChange} />
            )}
            {step === 4 && (
              <SocialsStep formData={formData} onSocialChange={onSocialChange} />
            )}
            {step === 5 && (
              <PayoutStep formData={formData} onFieldChange={onFieldChange} />
            )}
            {step === 6 && (
              <ReviewStep
                formData={formData}
                countries={countries}
                currencies={currencies}
              />
            )}
          </div>
          <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-line bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:static sm:px-8 sm:pb-4">
            {step > 1 && !isReview && (
              <Button
                variant="secondary"
                leadingIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
                onClick={onBack}
              >
                {t("onboarding.back")}
              </Button>
            )}
            {isReview ? (
              <Button fullWidth size="lg" loading={loading} onClick={onFinish}>
                {t("onboarding.review.cta")}
              </Button>
            ) : (
              <Button
                fullWidth
                size="lg"
                disabled={!canContinue}
                trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />}
                onClick={onNext}
              >
                {t("onboarding.continue")}
              </Button>
            )}
          </div>
        </Card>
        <div className="mt-5 text-center">
          <Button variant="ghost" className="min-h-12" onClick={onSkip}>
            {t("onboarding.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
