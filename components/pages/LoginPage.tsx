"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Chrome,
  ArrowLeft,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { auth, db } from "@/db/firebase";

const LoginPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        router.push("/space"); // Existing user
      } else {
        router.push("/start"); // New user setup
      }
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      {/* Left Side: Branding & Info (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -mr-48 -mt-48 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[80px] -ml-32 -mb-32 opacity-30" />

        <div className="relative z-10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-12 group"
          >
            <ArrowLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to home
          </button>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black text-xl shadow-lg">
              n
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              ndafana.rw
            </span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-8">
            The home of <br />
            <span className="text-blue-200">Rwandan creativity.</span>
          </h1>

          <div className="space-y-6">
            {[
              {
                icon: <Zap size={20} />,
                title: "Instant Access",
                desc: "Connect with your fans in seconds.",
              },
              {
                icon: <ShieldCheck size={20} />,
                title: "Secure Payouts",
                desc: "Reliable Mobile Money withdrawals.",
              },
              {
                icon: <Sparkles size={20} />,
                title: "Simple 8% Fee",
                desc: "No hidden costs, no monthly subscriptions.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-blue-200 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold">{item.title}</h3>
                  <p className="text-blue-100/70 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-sm font-medium">
          © 2026 Ndafana. Empowering African Creators.
        </div>
      </div>

      {/* Right Side: Login Action */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 md:bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="md:hidden flex justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-100">
              n
            </div>
          </div>

          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-3">
              Welcome back
            </h2>
            <p className="text-slate-500 font-medium">
              Log in to manage your page or support your favorite artists.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 rounded-2xl font-bold text-slate-700 hover:border-blue-600 hover:bg-blue-50/30 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin text-blue-600" />
              ) : (
                <>
                  <Chrome className="text-red-500" size={20} />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 mt-6 px-4">
              By logging in, you agree to our <b>Terms</b> and{" "}
              <b>Privacy Policy</b>. We will never post to Google without your
              permission.
            </p>
          </div>

          {/* Supporter/Creator Switcher Hint */}
          <div className="mt-12 p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <p className="text-sm font-bold text-blue-900 mb-1">New here?</p>
            <p className="text-xs text-blue-600/80 leading-relaxed">
              Once you log in, you can choose to be a supporter or a creator.
              You can switch roles anytime from your dashboard.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
