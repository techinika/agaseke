"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/shell/PageHeader";
import { t } from "@/lib/i18n";
import { PhoneSecurityCard } from "./PhoneSecurityCard";
import { PayoutDetailsCard } from "./PayoutDetailsCard";
import { VerificationProgress } from "./VerificationProgress";
import { VerificationStatusBanner } from "./VerificationStatusBanner";
import type { VerificationFlowProps } from "./types";

export function VerificationFlow({
  status,
  isEditing,
  onStartEditing,
  values,
  onValueChange,
  idFile,
  onFileChange,
  loading,
  onSubmit,
  phoneNumber,
  onPhoneChange,
  phoneVerified,
  otpSent,
  otpCode,
  onOtpChange,
  otpBusy,
  onSendOtp,
  onVerifyOtp,
}: VerificationFlowProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div id="recaptcha-anchor" />
      <PageHeader
        title={t("verification.title")}
        description={t("verification.description")}
      />
      <div className="mt-6 flex flex-col gap-5">
        <VerificationStatusBanner status={status} onStartEditing={onStartEditing} />
        <Card className="p-5">
          <VerificationProgress
            phoneVerified={phoneVerified}
            values={values}
            idFile={idFile}
            status={status}
          />
        </Card>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PayoutDetailsCard
            isEditing={isEditing}
            values={values}
            onValueChange={onValueChange}
            idFile={idFile}
            onFileChange={onFileChange}
            loading={loading}
            onSubmit={onSubmit}
          />
          <div className="flex flex-col gap-5">
            <PhoneSecurityCard
              phoneNumber={phoneNumber}
              onPhoneChange={onPhoneChange}
              phoneVerified={phoneVerified}
              otpSent={otpSent}
              otpCode={otpCode}
              onOtpChange={onOtpChange}
              otpBusy={otpBusy}
              onSendOtp={onSendOtp}
              onVerifyOtp={onVerifyOtp}
            />
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-body-lg font-bold text-fg">
                <ShieldCheck className="size-5 text-brand-strong" aria-hidden="true" />
                {t("verification.why.title")}
              </h2>
              <p className="mt-2 text-label leading-relaxed text-muted-fg">
                {t("verification.why.body")}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
