"use client";

import { Globe, Instagram, Linkedin, Twitter, Video, Youtube } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import { StepHeading } from "../StepHeading";
import type { OnboardingFlowProps } from "../types";

type SocialField = "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok" | "web";

const SOCIAL_FIELDS: {
  field: SocialField;
  label: string;
  icon: typeof Globe;
  type: "text" | "url";
}[] = [
  {
    field: "instagram",
    label: t("onboarding.socials.instagram"),
    icon: Instagram,
    type: "text",
  },
  {
    field: "linkedin",
    label: t("onboarding.socials.linkedin"),
    icon: Linkedin,
    type: "url",
  },
  {
    field: "twitter",
    label: t("onboarding.socials.twitter"),
    icon: Twitter,
    type: "text",
  },
  {
    field: "youtube",
    label: t("onboarding.socials.youtube"),
    icon: Youtube,
    type: "url",
  },
  {
    field: "tiktok",
    label: t("onboarding.socials.tiktok"),
    icon: Video,
    type: "url",
  },
  { field: "web", label: t("onboarding.socials.web"), icon: Globe, type: "url" },
];

type Props = Pick<OnboardingFlowProps, "formData" | "onSocialChange">;

export function SocialsStep({ formData, onSocialChange }: Props) {
  return (
    <section>
      <StepHeading
        title={t("onboarding.socials.title")}
        description={t("onboarding.socials.description")}
        icon={<Globe className="size-5" />}
      />
      <div className="flex flex-col gap-4">
        {SOCIAL_FIELDS.map(({ field, label, icon: Icon, type }) => (
          <Input
            key={field}
            id={`onboarding-social-${field}`}
            label={label}
            type={type}
            inputMode={type === "url" ? "url" : "text"}
            value={formData.socials[field]}
            onChange={(event) => onSocialChange(field, event.target.value)}
            leading={<Icon className="size-4" aria-hidden="true" />}
          />
        ))}
      </div>
    </section>
  );
}
