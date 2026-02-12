"use client";
import React, { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { useAuth } from "@/auth/AuthContext";
import { auth, db } from "@/db/firebase";
import { toast } from "sonner";

export const VerificationPage = () => {
  const { creator, profile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  // Phone OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (creator) {
      setPhoneVerified(creator.phoneVerified || false);
      if (
        !creator.verificationStatus ||
        creator.verificationStatus === "rejected"
      ) {
        setIsEditing(true);
      }
    }
  }, [creator]);

  const handleSendOTP = async () => {
    const phone = (document.getElementById("phoneInput") as HTMLInputElement)
      .value;
    if (!phone) return alert("Enter phone number");

    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-anchor", {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult || otpCode.length < 5) return;
    try {
      await confirmationResult.confirm(otpCode);
      setPhoneVerified(true);
      setOtpSent(false);
      await updateDoc(doc(db, "creators", String(creator?.handle)), {
        phoneVerified: true,
      });
    } catch (err) {
      alert("Invalid Code");
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("uid", String(creator?.uid));

    try {
      const payload = {
        uid: creator?.uid,
        country: formData.get("country"),
        bankName: formData.get("bankName"),
        accountName: formData.get("accountName"),
        accountNumber: formData.get("accountNumber"),
        payoutPreference: formData.get("payoutPreference"),
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "verificationRequests"), payload);
      await updateDoc(doc(db, "creators", String(creator?.handle)), {
        verificationStatus: "pending",
      });

      await fetch("/api/comms/email/verify", {
        method: "POST",
        body: formData,
      });

      toast.success("Submission Successful");
      setIsEditing(false);
    } catch (err) {
      toast.error("Error submitting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] p-6 md:p-12 text-slate-900">
      <div id="recaptcha-anchor"></div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {creator?.verificationStatus === "approved" && !isEditing && (
            <div className="bg-black text-white p-6 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">Verified Account</p>
                <p className="text-sm opacity-70">
                  Your identity is confirmed.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm border border-white/30 px-4 py-2 rounded-lg hover:bg-white/10 transition"
              >
                Update
              </button>
            </div>
          )}

          {creator?.verificationStatus === "pending" && !isEditing && (
            <div className="bg-black text-white p-6 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">Pending Verification</p>
                <p className="text-sm opacity-70">
                  Your identity verification is pending. We will notify you once
                  it is verified.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm border border-white/30 px-4 py-2 rounded-lg hover:bg-white/10 transition"
              >
                Update
              </button>
            </div>
          )}

          {creator?.verificationStatus === "rejected" && !isEditing && (
            <div className="bg-black text-white p-6 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">Rejected Verification</p>
                <p className="text-sm opacity-70">
                  Your identity verification is rejected. Please update your
                  information and try again.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm border border-white/30 px-4 py-2 rounded-lg hover:bg-white/10 transition"
              >
                Update
              </button>
            </div>
          )}

          <div
            className={`bg-white p-8 md:p-10 rounded-lg border border-slate-100 shadow-sm ${!isEditing ? "opacity-60 grayscale-[0.5]" : ""}`}
          >
            <h2 className="text-2xl font-bold tracking-tight mb-8">
              Identity & Payouts
            </h2>

            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Preferred Mode
                  </label>
                  <select
                    name="payoutPreference"
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border-none rounded-lg p-4 focus:ring-2 focus:ring-black outline-none transition"
                  >
                    <option value="momo">MTN Mobile Money</option>
                    <option value="bank">Bank Account</option>
                    <option value="airtel">Airtel Money</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Country
                  </label>
                  <input
                    name="country"
                    required
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border-none rounded-lg p-4 outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Bank or Provider Name
                  </label>
                  <input
                    name="bankName"
                    required
                    disabled={!isEditing}
                    placeholder="e.g. Bank of Kigali"
                    className="w-full bg-slate-50 border-none rounded-lg p-4 outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Account Name
                  </label>
                  <input
                    name="accountName"
                    required
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border-none rounded-lg p-4 outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Account Number
                  </label>
                  <input
                    name="accountNumber"
                    required
                    disabled={!isEditing}
                    className="w-full bg-slate-50 border-none rounded-lg p-4 outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Identity Document (ID/Passport)
                </label>
                <label
                  className={`block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${isEditing ? "border-slate-200 hover:border-black" : "border-slate-100 bg-slate-50"}`}
                >
                  <input
                    type="file"
                    name="idFile"
                    required={isEditing}
                    disabled={!isEditing}
                    className="hidden"
                    onChange={(e) =>
                      setSelectedFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                  <span className="text-sm font-medium text-slate-500">
                    {selectedFileName || "Click to upload document"}
                  </span>
                </label>
              </div>

              {isEditing && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-5 rounded-lg font-bold hover:opacity-90 transition active:scale-[0.98] disabled:bg-slate-200"
                >
                  {loading ? "Processing..." : "Submit Verification Request"}
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <h3 className="font-bold mb-4">Phone Security</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Verify your phone to enable secure payouts and account recovery.
            </p>

            <div className="space-y-4">
              <input
                id="phoneInput"
                defaultValue={creator?.payoutNumber}
                disabled={phoneVerified}
                placeholder="+250..."
                className="w-full bg-slate-50 rounded-lg p-4 text-sm outline-none border-none focus:ring-2 focus:ring-black transition"
              />

              {!phoneVerified ? (
                <button
                  onClick={handleSendOTP}
                  className="w-full bg-slate-100 py-3 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                >
                  Send OTP
                </button>
              ) : (
                <div className="text-center py-3 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-widest">
                  Verified
                </div>
              )}

              {otpSent && !phoneVerified && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <input
                    maxLength={6}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter code"
                    className="w-full bg-white border-2 border-black rounded-lg p-4 text-center tracking-[0.5em] font-bold outline-none"
                  />
                  <button
                    onClick={handleVerifyOTP}
                    className="w-full bg-black text-white py-3 rounded-lg text-sm font-bold"
                  >
                    Verify Number
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-lg text-white">
            <h3 className="font-bold mb-2">Why Verify?</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Verification protects Agaseke from fraud and ensures your revenue
              is sent to the correct account within 24-48 hours of review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
