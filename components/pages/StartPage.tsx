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
  Globe,
  Instagram,
  Twitter,
  Youtube,
  Video,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/db/firebase";

export default function CreatorOnboarding() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const [formData, setFormData] = useState({
    username: searchParams.get("username") || "",
    fullName: "",
    bio: "",
    momoNumber: "",
    momoNetwork: "MTN",
    socials: {
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      web: "",
    },
  });

  // 1. Real-time Username Verification
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus("checking");
      try {
        const docRef = doc(db, "creators", formData.username);
        const docSnap = await getDoc(docRef);
        setUsernameStatus(docSnap.exists() ? "taken" : "available");
      } catch (err) {
        console.error(err);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

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
        verified: false,
        totalEarnings: 0,
        totalSupporters: 0,
        pendingPayout: 0,
        socials: {
          instagram: formData.socials.instagram || null,
          twitter: formData.socials.twitter || null,
          youtube: formData.socials.youtube || null,
          tiktok: formData.socials.tiktok || null,
          web: formData.socials.web || null,
        },
        perks: [],
        events: [],
        createdAt: serverTimestamp(),
        views: 0,
        verificationStatus: null,
        phoneVerified: false,
        foundingMember: false,
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

  const skipOnboarding = () => router.push("/supporter");
  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6">
      {/* Progress Bar */}
      <div className="w-full max-w-sm mb-12 flex justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-500 ${step >= i ? "bg-orange-600 text-white shadow-lg shadow-orange-100" : "bg-white border-2 border-slate-100 text-slate-300"}`}
          >
            {step > i ? <Check size={14} strokeWidth={3} /> : i}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-lg shadow-sm border border-slate-100">
        {/* Step 1: Username & Real-time check */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">
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
                className={`w-full p-5 pl-28 bg-slate-50 border-2 rounded-lg text-xl font-bold outline-none transition-all ${
                  usernameStatus === "taken"
                    ? "border-red-400"
                    : usernameStatus === "available"
                      ? "border-green-400"
                      : "border-transparent focus:border-orange-500"
                }`}
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase().replace(/\s/g, ""),
                  })
                }
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="animate-spin text-slate-300" size={20} />
                )}
                {usernameStatus === "available" && (
                  <Check className="text-green-500" size={20} />
                )}
                {usernameStatus === "taken" && (
                  <XCircle className="text-red-500" size={20} />
                )}
              </div>
            </div>
            {usernameStatus === "taken" && (
              <p className="text-red-500 text-xs font-bold text-center">
                Sorry, this username is already taken.
              </p>
            )}
            <button
              onClick={nextStep}
              disabled={!formData.username || usernameStatus !== "available"}
              className="w-full bg-slate-900 text-white py-5 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-slate-900"
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Bio */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">
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
                className="flex-1 bg-slate-900 text-white py-5 rounded-lg font-bold text-lg hover:bg-orange-600 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Social Media (New) */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">
                Social Media
              </h1>
              <p className="text-slate-500 text-sm">
                Where else can fans find you?
              </p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Instagram
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  placeholder="Instagram handle"
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={formData.socials.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: {
                        ...formData.socials,
                        instagram: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="relative">
                <Twitter
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  placeholder="Twitter handle"
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={formData.socials.twitter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, twitter: e.target.value },
                    })
                  }
                />
              </div>
              <div className="relative">
                <Youtube
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  placeholder="YouTube channel"
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={formData.socials.youtube}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, youtube: e.target.value },
                    })
                  }
                />
              </div>
              <div className="relative">
                <Video
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  placeholder="TikTok handle"
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={formData.socials.tiktok}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, tiktok: e.target.value },
                    })
                  }
                />
              </div>
              <div className="relative">
                <Globe
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  placeholder="External Website / Link"
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={formData.socials.web}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, web: e.target.value },
                    })
                  }
                />
              </div>
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
                className="flex-1 bg-slate-900 text-white py-5 rounded-lg font-bold text-lg hover:bg-orange-600 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payout (Moved to 4) */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter">
                Payout Method
              </h1>
              <p className="text-slate-500 text-sm">
                Include your country code (e.g. +250...)
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
                    className={`flex-1 py-4 rounded-lg border-2 font-bold text-sm transition-all ${formData.momoNetwork === net ? "border-orange-600 bg-orange-50 text-orange-600" : "border-slate-50 text-slate-300"}`}
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
                  placeholder="+250 78..."
                  className="w-full p-5 pl-12 bg-slate-50 border border-slate-100 rounded-lg text-center text-xl font-bold tracking-tight focus:border-orange-500 outline-none"
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
                className="flex-1 bg-slate-900 text-white py-5 rounded-lg font-bold text-lg hover:bg-orange-600 transition-all"
              >
                Save Number
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Final Confirmation (Moved to 5) */}
        {step === 5 && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-3xl font-bold tracking-tighter">
                You are Ready!
              </h1>
              <p className="text-slate-500 text-sm">
                Confirm your details to launch.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-lg space-y-3 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  Public Link
                </span>
                <span className="font-bold text-orange-600 tracking-tighter">
                  agaseke.me/{formData.username}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                  Payout
                </span>
                <span className="font-bold text-slate-700">
                  {formData.momoNumber}
                </span>
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-orange-600 text-white py-5 rounded-lg font-bold text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-3"
            >
              {loading ? "Creating Agaseke..." : "Launch My Agaseke"}
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={skipOnboarding}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-orange-600 transition-colors"
          >
            I&apos;ll set this up later — Skip
          </button>
        </div>
      </div>
    </div>
  );
}
