"use client";

import { BadgeCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { t } from "@/lib/i18n";
import type { VerificationFlowProps } from "./types";

type Props = Pick<
  VerificationFlowProps,
  | "phoneNumber"
  | "onPhoneChange"
  | "phoneVerified"
  | "otpSent"
  | "otpCode"
  | "onOtpChange"
  | "otpBusy"
  | "onSendOtp"
  | "onVerifyOtp"
>;

export function PhoneSecurityCard({
  phoneNumber,
  onPhoneChange,
  phoneVerified,
  otpSent,
  otpCode,
  onOtpChange,
  otpBusy,
  onSendOtp,
  onVerifyOtp,
}: Props) {
  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title font-bold text-fg">
            {t("verification.phone.title")}
          </h2>
          <p className="mt-1 text-label text-muted-fg">
            {t("verification.phone.description")}
          </p>
        </div>
        {phoneVerified && (
          <Badge tone="success">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {t("verification.phone.verified")}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Input
          id="verification-phone"
          label={t("verification.phone.number")}
          placeholder={t("verification.phone.placeholder")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneNumber}
          disabled={phoneVerified}
          onChange={(event) => onPhoneChange(event.target.value)}
          leading={<Smartphone className="size-4" aria-hidden="true" />}
        />
        {!phoneVerified && (
          <Button
            variant="secondary"
            fullWidth
            loading={otpBusy === "send"}
            onClick={onSendOtp}
          >
            {otpBusy === "send"
              ? t("verification.phone.sending")
              : t("verification.phone.send")}
          </Button>
        )}
        {otpSent && !phoneVerified && (
          <div className="flex flex-col gap-3 rounded-control border border-line bg-surface-sunken p-4">
            <Input
              id="verification-otp"
              label={t("verification.phone.code")}
              hint={t("verification.phone.codeHint")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, ""))}
              className="text-center text-body-lg tracking-[0.4em]"
            />
            <Button fullWidth loading={otpBusy === "verify"} onClick={onVerifyOtp}>
              {otpBusy === "verify"
                ? t("verification.phone.confirming")
                : t("verification.phone.confirm")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
