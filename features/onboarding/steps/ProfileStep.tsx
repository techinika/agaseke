"use client";

import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

type Props = Pick<OnboardingFlowProps, "formData" | "onFieldChange">;

export function ProfileStep({ formData, onFieldChange }: Props) {
  return (
    <section>
      <StepHeading
        title={t("onboarding.profile.title")}
        description={t("onboarding.profile.description")}
        icon={<UserRound className="size-5" />}
      />
      <div className="flex flex-col gap-5">
        <Input
          id="onboarding-name"
          label={t("onboarding.profile.name")}
          placeholder={t("onboarding.profile.namePlaceholder")}
          value={formData.fullName}
          autoComplete="name"
          onChange={(event) => onFieldChange("fullName", event.target.value)}
        />
        <Textarea
          id="onboarding-bio"
          label={t("onboarding.profile.bio")}
          hint={t("onboarding.profile.bioHint")}
          placeholder={t("onboarding.profile.bioPlaceholder")}
          value={formData.bio}
          rows={4}
          onChange={(event) => onFieldChange("bio", event.target.value)}
        />
      </div>
    </section>
  );
}
