"use client";

import { useState } from "react";
import { AuthShell } from "@/components/shell/AuthShell";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import type {
  OnboardingFormData,
  OnboardingStep,
  OnboardingSocials,
  UsernameStatus,
} from "@/features/onboarding/types";

const COUNTRIES = [
  { id: "rw", code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { id: "ke", code: "KE", name: "Kenya", flag: "🇰🇪" },
  { id: "ug", code: "UG", name: "Uganda", flag: "🇺🇬" },
];

const CURRENCIES = [
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
];

const INITIAL_FORM: OnboardingFormData = {
  username: "aline",
  fullName: "Aline Uwase",
  bio: "Sharing Rwandan stories and music.",
  momoNumber: "+250 780 000 000",
  momoNetwork: "MTN",
  country: "RW",
  currency: "RWF",
  socials: {
    instagram: "aline",
    linkedin: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    web: "",
  },
};

export function AuthOnboardingPreview() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_FORM);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("available");

  return (
    <AuthShell>
      <OnboardingFlow
        step={step}
        formData={formData}
        usernameStatus={usernameStatus}
        countries={COUNTRIES}
        currencies={CURRENCIES}
        availableCurrencies={[CURRENCIES[0]]}
        locationDataError={false}
        locationLoading={false}
        loading={false}
        onFieldChange={(field, value) => {
          setFormData((previous) => ({ ...previous, [field]: value }));
          if (field === "username") {
            setUsernameStatus(value.length >= 3 ? "available" : "idle");
          }
        }}
        onSocialChange={(field: keyof OnboardingSocials, value) =>
          setFormData((previous) => ({
            ...previous,
            socials: { ...previous.socials, [field]: value },
          }))
        }
        onNext={() => setStep((previous) => Math.min(6, previous + 1) as OnboardingStep)}
        onBack={() => setStep((previous) => Math.max(1, previous - 1) as OnboardingStep)}
        onFinish={() => undefined}
        onSkip={() => undefined}
        onRetryLocation={() => undefined}
      />
    </AuthShell>
  );
}
