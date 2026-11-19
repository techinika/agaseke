"use client";

import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

const NETWORKS = ["MTN", "Airtel"] as const;

type Props = Pick<OnboardingFlowProps, "formData" | "onFieldChange">;

export function PayoutStep({ formData, onFieldChange }: Props) {
  return (
    <section>
      <StepHeading
        title={t("onboarding.payout.title")}
        description={t("onboarding.payout.description")}
        icon={<Smartphone className="size-5" />}
      />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p id="onboarding-network-label" className="text-label font-semibold text-fg">
            {t("onboarding.payout.network")}
          </p>
          <div
            role="group"
            aria-labelledby="onboarding-network-label"
            className="grid grid-cols-2 gap-3"
          >
            {NETWORKS.map((network) => (
              <Button
                key={network}
                variant={formData.momoNetwork === network ? "primary" : "secondary"}
                aria-pressed={formData.momoNetwork === network}
                onClick={() => onFieldChange("momoNetwork", network)}
              >
                {network} Money
              </Button>
            ))}
          </div>
        </div>
        <Input
          id="onboarding-phone"
          label={t("onboarding.payout.number")}
          hint={t("onboarding.payout.hint")}
          placeholder={t("onboarding.payout.placeholder")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formData.momoNumber}
          onChange={(event) => onFieldChange("momoNumber", event.target.value)}
          leading={<Smartphone className="size-4" aria-hidden="true" />}
        />
      </div>
    </section>
  );
}
