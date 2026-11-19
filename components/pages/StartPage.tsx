"use client";

import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { useOnboarding } from "@/features/onboarding/useOnboarding";

export default function CreatorOnboarding() {
  const onboarding = useOnboarding();
  return <OnboardingFlow {...onboarding} />;
}
