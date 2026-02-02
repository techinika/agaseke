"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Check,
  ArrowRight,
  Smartphone,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/db/firebase";

export default function CreatorOnboarding() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [formData, setFormData] = useState({
    username: searchParams.get("username") || "",
    fullName: "",
    bio: "",
    momoNumber: "",
    momoNetwork: "MTN",
  });

  useEffect(() => {
    const checkUserStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "profiles", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().type === "creator") {
          router.push("/creator");
        }
      }
    };
    checkUserStatus();
  }, [router]);

  const handleFinish = async () => {
    setLoading(true);
    const user = auth.currentUser;

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    try {
      await setDoc(doc(db, "creators", formData.username), {
        uid: user.uid,
        name: formData.fullName,
        bio: formData.bio,
        handle: formData.username,
        payoutNumber: formData.momoNumber,
        network: formData.momoNetwork,
        verified: isVerified,
        totalEarnings: 0,
        totalSupporters: 0,
        pendingPayout: 0,
        socials: {
          instagram: null,
          twitter: null,
          youtube: null,
          tiktok: null,
          web: null,
        },
        perks: [],
        events: [],
        createdAt: serverTimestamp(),
        views: 0,
      });

      await updateDoc(doc(db, "profiles", user.uid), {
        type: "creator",
        username: formData.username,
        onboarded: true,
      });

      toast.success("Welcome to the creator family!");
      router.push("/creator");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  const skipOnboarding = () => {
    router.push("/supporter");
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm mb-12 flex justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${step >= i ? "bg-orange-600 text-white shadow-lg shadow-orange-100" : "bg-white border-2 border-slate-100 text-slate-300"}`}
          >
            {step > i ? <Check size={14} strokeWidth={3} /> : i}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-lg shadow-sm border border-slate-100">
        {/* Step 1: Username */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
              <h1
                className="text-3xl font-black 
             tracking-tighter"
              >
                Claim your link
              </h1>
              <p className="text-slate-500 text-sm">
                This is your permanent address on Agaseke.
              </p>
            </div>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold tracking-tighter">
                agaseke.me/
              </div>
              <input
                autoFocus
                type="text"
                className="w-full p-5 pl-28 bg-slate-50 border-2 border-transparent rounded-lg text-xl font-black focus:border-orange-500 focus:bg-white outline-none transition-all"
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
              className="w-full bg-slate-900 text-white py-5 rounded-lg font-black text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all active:scale-95"
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Bio */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black tracking-tighter">
                The Creator
              </h1>
              <p className="text-slate-500 text-sm">
                How should we introduce you?
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Display Name (e.g. Gisa Patrick)"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg font-bold outline-none focus:border-orange-500"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
              <textarea
                placeholder="Tell your fans what you're creating..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg h-32 resize-none font-medium outline-none focus:border-orange-500"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="p-5 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.fullName}
                className="flex-1 bg-slate-900 text-white py-5 rounded-lg font-black text-lg hover:bg-orange-600 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: MoMo */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black tracking-tighter">
                Payout Method
              </h1>
              <p className="text-slate-500 text-sm">
                Where should we send your support?
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                {["MTN", "Airtel"].map((net) => (
                  <button
                    key={net}
                    onClick={() =>
                      setFormData({ ...formData, momoNetwork: net })
                    }
                    className={`flex-1 py-4 rounded-lg border-2 font-black text-sm transition-all ${formData.momoNetwork === net ? "border-orange-600 bg-orange-50 text-orange-600" : "border-slate-50 text-slate-300"}`}
                  >
                    {net} Money
                  </button>
                ))}
              </div>
              <div className="relative">
                <Smartphone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={20}
                />
                <input
                  type="tel"
                  placeholder="078..."
                  className="w-full p-5 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-center text-xl font-black tracking-widest focus:border-orange-500 outline-none"
                  value={formData.momoNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, momoNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                className="p-5 bg-slate-50 rounded-lg text-slate-400 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.momoNumber}
                className="flex-1 bg-slate-900 text-white py-5 rounded-lg font-black text-lg hover:bg-orange-600 transition-all"
              >
                Verify My Number
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Confirmation */}
        {step === 4 && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">
                You are Ready!
              </h1>
              <p className="text-slate-500 text-sm">
                Confirm your details to launch.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-lg space-y-3 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Public Link
                </span>
                <span className="font-black text-orange-600">
                  agaseke.me/{formData.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Payout
                </span>
                <span className="font-black text-slate-700">
                  {formData.momoNumber} ({formData.momoNetwork})
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-orange-600 text-white py-5 rounded-lg font-black text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-3"
            >
              {loading ? "Creating Space..." : "Launch My Agaseke"}
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={skipOnboarding}
            className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-orange-600 transition-colors"
          >
            I&apos;ll set this up later — Skip
          </button>
        </div>
      </div>
    </div>
  );
}
