export type VerificationStatus = "approved" | "pending" | "rejected" | null;

export interface VerificationValues {
  payoutPreference: string;
  country: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
}

export interface VerificationFlowProps {
  status: VerificationStatus;
  isEditing: boolean;
  onStartEditing: () => void;
  values: VerificationValues;
  onValueChange: (field: keyof VerificationValues, value: string) => void;
  idFile: File | null;
  onFileChange: (file: File | null) => void;
  loading: boolean;
  onSubmit: () => void;
  phoneNumber: string;
  onPhoneChange: (value: string) => void;
  phoneVerified: boolean;
  otpSent: boolean;
  otpCode: string;
  onOtpChange: (value: string) => void;
  otpBusy: "send" | "verify" | null;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}
