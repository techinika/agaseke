"use client";

import { useCallback, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { auth } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import { uploadFile } from "@/lib/uploadService";
import {
  hasPendingVerificationRequest,
  markCreatorPhoneVerified,
  submitVerificationRequest,
} from "@/lib/verificationService";
import type { VerificationFlowProps, VerificationValues } from "./types";

const emptyValues: VerificationValues = {
  payoutPreference: "momo",
  country: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  swiftCode: "",
};

export function useVerification(): VerificationFlowProps {
  const { creator } = useAuth();

  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<VerificationValues>({ ...emptyValues });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerifiedLocally, setPhoneVerifiedLocally] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(
    null,
  );
  const [otpBusy, setOtpBusy] = useState<"send" | "verify" | null>(null);

  const status = creator?.verificationStatus ?? null;
  const isEditing = editingOverride ?? (!status || status === "rejected");
  const phoneVerified = phoneVerifiedLocally || Boolean(creator?.phoneVerified);
  const phoneNumber = phoneInput ?? creator?.payoutNumber ?? "";

  const onValueChange = useCallback((field: keyof VerificationValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const onSendOtp = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Enter a phone number first.");
      return;
    }

    setOtpBusy("send");
    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-anchor", {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      toast.success("OTP sent to your phone");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send OTP");
    } finally {
      setOtpBusy(null);
    }
  };

  const onVerifyOtp = async () => {
    if (!confirmationResult || otpCode.length < 5) {
      toast.error("Enter the complete code.");
      return;
    }

    setOtpBusy("verify");
    try {
      await confirmationResult.confirm(otpCode);
      setPhoneVerifiedLocally(true);
      setOtpSent(false);
      await markCreatorPhoneVerified(String(creator?.handle));
      toast.success("Phone verified successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Invalid OTP code");
    } finally {
      setOtpBusy(null);
    }
  };

  const onSubmit = async () => {
    setLoading(true);

    try {
      if (!idFile) {
        toast.error("Please upload an identity document");
        setLoading(false);
        return;
      }

      const uploadResult = await uploadFile(
        idFile,
        "verification_document",
        creator?.handle || "",
      );
      const idDocumentUrl = uploadResult.url;

      await sendCommsEmail("verification_request", {
        adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "agasekeforcreators@gmail.com",
        uid: creator?.uid,
        accountName: values.accountName,
        bankName: values.bankName,
        accountNumber: values.accountNumber,
        country: values.country,
        payoutPreference: values.payoutPreference,
        swiftCode: values.swiftCode || "N/A",
      });

      const payload = {
        uid: creator?.uid,
        country: values.country,
        bankName: values.bankName,
        accountName: values.accountName,
        accountNumber: values.accountNumber,
        swiftCode: values.swiftCode || "N/A",
        payoutPreference: values.payoutPreference,
        status: "pending",
        idDocumentUrl,
      };

      if (creator?.uid && (await hasPendingVerificationRequest(creator.uid))) {
        toast.error("You already have a pending verification request");
        setLoading(false);
        return;
      }

      await submitVerificationRequest(payload, String(creator?.handle));
      toast.success("Submission Successful");
      setEditingOverride(false);
    } catch {
      toast.error("Error submitting");
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    isEditing,
    onStartEditing: () => setEditingOverride(true),
    values,
    onValueChange,
    idFile,
    onFileChange: setIdFile,
    loading,
    onSubmit,
    phoneNumber,
    onPhoneChange: setPhoneInput,
    phoneVerified,
    otpSent,
    otpCode,
    onOtpChange: setOtpCode,
    otpBusy,
    onSendOtp,
    onVerifyOtp,
  };
}
