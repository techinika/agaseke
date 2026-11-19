"use client";

import { Check, Link2, Loader2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

export function ClaimLinkStep({
  username,
  usernameStatus,
  onFieldChange,
}: Pick<OnboardingFlowProps, "usernameStatus" | "onFieldChange"> & {
  username: string;
}) {
  const error =
    usernameStatus === "taken"
      ? t("onboarding.link.taken")
      : usernameStatus === "invalid"
        ? t("onboarding.link.invalid")
        : undefined;
  const hint =
    usernameStatus === "checking"
      ? t("onboarding.link.checking")
      : usernameStatus === "available"
        ? t("onboarding.link.available")
        : t("onboarding.link.hint");

  return (
    <section>
      <StepHeading
        title={t("onboarding.link.title")}
        description={t("onboarding.link.description")}
        icon={<Link2 className="size-5" />}
      />
      <Input
        id="onboarding-username"
        label={t("onboarding.link.label")}
        hint={hint}
        error={error}
        value={username}
        maxLength={19}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        onChange={(event) => onFieldChange("username", event.target.value)}
        leading={<span className="text-label font-semibold">agaseke.me/</span>}
        className="pl-32 font-semibold"
        trailing={
          usernameStatus === "checking" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : usernameStatus === "available" ? (
            <Check className="size-5 text-success" aria-hidden="true" />
          ) : usernameStatus === "taken" || usernameStatus === "invalid" ? (
            <XCircle className="size-5 text-danger" aria-hidden="true" />
          ) : null
        }
      />
      <p className="mt-3 text-caption text-muted-fg" aria-live="polite">
        agaseke.me/{username || "yourname"}
      </p>
    </section>
  );
}
