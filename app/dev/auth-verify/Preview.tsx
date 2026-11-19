"use client";

import { useState } from "react";
import { AuthShell } from "@/components/shell/AuthShell";
import { VerificationFlow } from "@/features/verification/VerificationFlow";
import type {
  VerificationStatus,
  VerificationValues,
} from "@/features/verification/types";

const INITIAL_VALUES: VerificationValues = {
  payoutPreference: "momo",
  country: "RW",
  bankName: "MTN Mobile Money",
  accountName: "Aline Uwase",
  accountNumber: "780000000",
  swiftCode: "",
};

export function AuthVerifyPreview() {
  const [status] = useState<VerificationStatus>(null);
  const [values, setValues] = useState<VerificationValues>(INITIAL_VALUES);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("+250 780 000 000");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState<"send" | "verify" | null>(null);

  return (
    <AuthShell>
      <VerificationFlow
        status={status}
        isEditing
        onStartEditing={() => undefined}
        values={values}
        onValueChange={(field, value) =>
          setValues((previous) => ({ ...previous, [field]: value }))
        }
        idFile={idFile}
        onFileChange={setIdFile}
        loading={false}
        onSubmit={() => undefined}
        phoneNumber={phoneNumber}
        onPhoneChange={setPhoneNumber}
        phoneVerified={phoneVerified}
        otpSent={otpSent}
        otpCode={otpCode}
        onOtpChange={setOtpCode}
        otpBusy={otpBusy}
        onSendOtp={() => {
          setOtpBusy("send");
          setOtpSent(true);
          setOtpBusy(null);
        }}
        onVerifyOtp={() => {
          setOtpBusy("verify");
          setPhoneVerified(true);
          setOtpSent(false);
          setOtpBusy(null);
        }}
      />
    </AuthShell>
  );
}
