"use client";

import React, { useState } from "react";
import {
  Check,
  ArrowRight,
  Camera,
  Smartphone,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Lock,
} from "lucide-react";

export default function CreatorOnboarding() {
  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    bio: "",
    momoNumber: "",
    momoNetwork: "MTN",
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSendOtp = () => {
    // Logic to trigger SMS via provider (e.g., Africa's Talking or Twilio)
    setOtpSent(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {/* --- Progress Bar --- */}
      <div className="w-full max-w-md mb-12 flex justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
              step >= i
                ? "bg-orange-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {step > i ? <Check size={12} /> : i}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* --- Step 1: Handle --- */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <header>
              <h1 className="text-3xl font-black mb-2 text-slate-900">
                Claim your link
              </h1>
              <p className="text-slate-500">How should fans find you?</p>
            </header>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ags.ke/
              </div>
              <input
                autoFocus
                type="text"
                placeholder="username"
                className="w-full p-4 pl-20 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-bold focus:border-orange-500 focus:bg-white outline-none transition-all"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase().replace(/\s/g, ""),
                  })
                }
              />
            </div>
            <button
              onClick={nextStep}
              disabled={!formData.username}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* --- Step 2: Identity --- */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header>
              <h1 className="text-3xl font-black mb-2 text-slate-900">
                Tell your story
              </h1>
              <p className="text-slate-500">Let people know who you are.</p>
            </header>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-orange-500"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
              <textarea
                placeholder="Short bio..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl h-32 resize-none outline-none focus:border-orange-500"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="flex-1 border border-slate-200 py-4 rounded-xl font-bold"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-[2] bg-slate-900 text-white py-4 rounded-xl font-bold"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* --- Step 3: Payout Info --- */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header>
              <h1 className="text-3xl font-black mb-2 text-slate-900">
                Get paid
              </h1>
              <p className="text-slate-500">Enter your Mobile Money details.</p>
            </header>
            <div className="space-y-4">
              <div className="flex gap-2">
                {["MTN", "Airtel"].map((net) => (
                  <button
                    key={net}
                    onClick={() =>
                      setFormData({ ...formData, momoNetwork: net })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 font-bold ${
                      formData.momoNetwork === net
                        ? "border-orange-600 bg-orange-50 text-orange-600"
                        : "border-slate-100 text-slate-400"
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
              <input
                type="tel"
                placeholder="078... or 073..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-center text-xl font-bold tracking-widest focus:border-orange-500"
                value={formData.momoNumber}
                onChange={(e) =>
                  setFormData({ ...formData, momoNumber: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="flex-1 border border-slate-200 py-4 rounded-xl font-bold text-slate-400"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.momoNumber}
                className="flex-[2] bg-slate-900 text-white py-4 rounded-xl font-bold"
              >
                Verify Number
              </button>
            </div>
          </div>
        )}

        {/* --- Step 4: OTP Verification --- */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <header>
              <h1 className="text-3xl font-black mb-2 text-slate-900 text-center">
                Security Check
              </h1>
              <p className="text-slate-500 text-center">
                Verify {formData.momoNumber} to enable future withdrawals.
              </p>
            </header>

            {!otpSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone size={32} />
                </div>
                <button
                  onClick={handleSendOtp}
                  className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition"
                >
                  Send OTP via SMS
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-2xl font-black tracking-[0.5em] focus:border-orange-500 outline-none"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    if (e.target.value === "123456") setIsVerified(true); // Mock verification
                  }}
                />
                <p className="text-center text-xs text-slate-400">
                  Didn&apos;t receive it?{" "}
                  <button className="text-orange-600 font-bold underline">
                    Resend
                  </button>
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={nextStep}
                className={`w-full py-4 rounded-xl font-bold transition ${isVerified ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                {isVerified ? "Successfully Verified" : "Verify Later"}
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-4 px-6">
                Note: You can skip this now, but you must verify your number
                before withdrawing funds.
              </p>
            </div>
          </div>
        )}

        {/* --- Step 5: Final Review --- */}
        {step === 5 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-2xl">
                {isVerified ? <Check size={40} /> : "!"}
              </div>
              <h1 className="text-3xl font-black">Final Look</h1>
              <p className="text-slate-500 mt-2">
                Ready to start receiving support?
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Public Link
                </span>
                <span className="font-bold text-orange-600">
                  ags.ke/{formData.username}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Payout MoMo
                </span>
                <div className="text-right">
                  <span className="font-bold text-slate-700 block">
                    {formData.momoNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {isVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>
            </div>

            {!isVerified && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertCircle
                  size={18}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Verification Pending:</strong> Your profile will be
                  public, but payout withdrawals will be locked until you verify
                  this number.
                </p>
              </div>
            )}

            <button
              onClick={() => (window.location.href = `/${formData.username}`)}
              className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all"
            >
              Launch My Agaseke
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
