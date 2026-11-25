"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { auth } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import { getClientAdminEmail } from "@/lib/comms/adminEmail";
import { subscribeToLatestVerificationRequest } from "@/lib/payoutsService";
import {
  storedAssetValue,
  uploadFile,
  type UploadResult,
} from "@/lib/uploadService";
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

async function uploadVerificationDocument(
  file: File,
  handle: string,
): Promise<UploadResult> {
  try {
    return await uploadFile(file, "verification_document", handle, undefined, "private");
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("not configured")) {
      return await uploadFile(file, "verification_document", handle, undefined, "public");
    }
    throw error;
  }
}

export function useVerification(): VerificationFlowProps {
  const { creator, user } = useAuth();

  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<VerificationValues>({ ...emptyValues });
  const [latestRequest, setLatestRequest] = useState<Record<string, unknown> | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerifiedLocally, setPhoneVerifiedLocally] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(
    null,
  );
  const [otpBusy, setOtpBusy] = useState<"send" | "verify" | null>(null);
  const userEditedRef = useRef(false);

  const uid = creator?.uid || user?.uid || "";
  const creatorRecord = creator as unknown as Record<string, unknown> | null;
  const creatorPayoutPreference =
    typeof creatorRecord?.payoutPreference === "string"
      ? creatorRecord.payoutPreference
      : "momo";

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToLatestVerificationRequest(uid, (docData) => {
      setLatestRequest(docData);
      if (!userEditedRef.current && docData) {
        setValues({
          payoutPreference: String(
            docData.payoutPreference || creatorPayoutPreference,
          ),
          country: String(docData.country || ""),
          bankName: String(docData.bankName || ""),
          accountName: String(docData.accountName || ""),
          accountNumber: String(
            docData.accountNumber || creator?.payoutNumber || "",
          ),
          swiftCode:
            docData.swiftCode && docData.swiftCode !== "N/A"
              ? String(docData.swiftCode)
              : "",
        });
      }
    });
    return () => unsub();
  }, [uid, creatorPayoutPreference, creator?.payoutNumber]);

  const status =
    creator?.verified === true
      ? "approved"
      : (creator?.verificationStatus ?? null);
  const isEditing = editingOverride ?? (!status || status === "rejected");
  const phoneVerified = phoneVerifiedLocally || Boolean(creator?.phoneVerified);
  const phoneNumber = phoneInput ?? creator?.payoutNumber ?? "";

  const creatorRejectionReason =
    typeof creatorRecord?.verificationRejectionReason === "string"
      ? creatorRecord.verificationRejectionReason
      : "";
  const requestRejectionReason =
    typeof latestRequest?.rejectionReason === "string"
      ? latestRequest.rejectionReason
      : "";
  const rejectionReason = creatorRejectionReason || requestRejectionReason || null;

  const onValueChange = useCallback((field: keyof VerificationValues, value: string) => {
    userEditedRef.current = true;
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
      if (!creator?.handle || !uid) {
        toast.error("Creator profile is not ready");
        setLoading(false);
        return;
      }

      if (creator.verified === true || creator.verificationStatus === "approved") {
        toast.info("Your account is already verified");
        setLoading(false);
        return;
      }

      if (!idFile) {
        toast.error("Please upload an identity document");
        setLoading(false);
        return;
      }

      if (await hasPendingVerificationRequest(uid)) {
        toast.error("You already have a pending verification request");
        setLoading(false);
        return;
      }

      const uploadResult = await uploadVerificationDocument(idFile, creator.handle);
      const idDocumentValue = storedAssetValue(uploadResult);

      const creatorEmail =
        typeof creatorRecord?.email === "string" && creatorRecord.email.trim()
          ? creatorRecord.email.trim()
          : user?.email || "";

      const payload: Record<string, unknown> = {
        schemaVersion: 2,
        uid,
        creatorHandle: creator.handle,
        handle: creator.handle,
        creatorName: creator.name || creator.handle,
        email: creatorEmail,
        phoneNumber: phoneNumber || creator.payoutNumber || "",
        phoneVerified,
        country: values.country.trim(),
        bankName: values.bankName.trim(),
        accountName: values.accountName.trim(),
        accountNumber: values.accountNumber.trim(),
        swiftCode: values.swiftCode.trim() || "N/A",
        payoutPreference: values.payoutPreference,
        status: "pending",
        idDocumentUrl: idDocumentValue,
        idDocumentKey: uploadResult.key,
        idDocumentVisibility: uploadResult.visibility,
        idDocumentName: idFile.name,
        idDocumentMimeType: idFile.type || "",
      };

      await submitVerificationRequest(payload, String(creator.handle));

      try {
        await sendCommsEmail("verification_request", {
          adminEmail: getClientAdminEmail(),
          uid,
          creatorHandle: creator.handle,
          creatorName: creator.name || creator.handle,
          email: creatorEmail,
          phoneNumber: phoneNumber || creator.payoutNumber || "",
          accountName: values.accountName.trim(),
          bankName: values.bankName.trim(),
          accountNumber: values.accountNumber.trim(),
          country: values.country.trim(),
          payoutPreference: values.payoutPreference,
          swiftCode: values.swiftCode.trim() || "N/A",
        });
      } catch (emailErr) {
        console.warn("Verification submitted but admin email failed:", emailErr);
      }

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
    rejectionReason,
  };
}
