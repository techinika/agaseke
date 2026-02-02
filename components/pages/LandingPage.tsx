"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
  Coffee,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LandingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  const handleClaim = () => {
    if (username) {
      router.push(`/login?username=${username}`);
    } else {
      toast.info("Please enter a valid username to continue.");
    }
  };
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-100">
      <header className="px-6 py-20 md:py-32 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-xs font-bold mb-8 animate-fade-in">
          <Sparkles size={14} />{" "}
          <span>The first creator platform for Rwanda</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
          Fuel your creativity with <br />
          <span className="text-orange-600">local support.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Agaseke makes it easy for your community to support your work. Receive
          contributions, share exclusives, and withdraw to MoMo instantly.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center bg-white p-2 rounded-lg border-2 border-slate-100 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-50 transition-all w-full max-w-lg shadow-xl">
            <div className="flex items-center flex-1 w-full px-2">
              <span className="pl-2 pr-1 text-slate-400 font-semibold select-none">
                agaseke.me/
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                }
                placeholder="yourname"
                className="bg-transparent outline-none font-bold text-slate-800 flex-1 py-4 text-lg placeholder:text-slate-300 w-full"
              />
            </div>

            <button
              onClick={handleClaim}
              className="w-full sm:w-auto bg-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-orange-700 transition-all active:scale-95 whitespace-nowrap shadow-lg shadow-orange-200"
            >
              Claim your Agaseke
            </button>
          </div>

          <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" /> Free to start.
            No monthly fees.
          </p>
        </div>
      </header>

      {/* --- Features: More "Relational" --- */}
      <section className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Coffee className="text-orange-600" />}
            title="Fan Support"
            desc="Let your fans buy you a 'virtual coffee.' A simple way for your community to say thank you."
          />
          <FeatureCard
            icon={<Smartphone className="text-orange-600" />}
            title="Native MoMo"
            desc="The only platform integrated with MTN & Airtel Rwanda. No foreign bank accounts required."
          />
          <FeatureCard
            icon={<Lock className="text-orange-600" />}
            title="Exclusive Space"
            desc="Offer private gatherings, digital assets, or early access to your most loyal supporters."
          />
          <FeatureCard
            icon={<Zap className="text-orange-600" />}
            title="Instant Payouts"
            desc="Your balance is your money. Withdraw any time and see it hit your phone in seconds."
          />
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-slate-950 rounded-lg p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-orange-500 font-black uppercase tracking-[0.2em] text-sm mb-4">
              Simple Pricing
            </h2>
            <div className="text-8xl font-black mb-6">10%</div>
            <p className="text-xl text-slate-400 max-w-md mx-auto leading-relaxed">
              We only make money when you do. No setup fees, no subscription,
              just a flat platform fee.
            </p>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-600/20 blur-[100px] rounded-full"></div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white p-8 rounded-lg border border-slate-200/60 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5 transition-all duration-500 group">
      <div className="mb-6 p-4 bg-slate-50 group-hover:bg-orange-50 w-fit rounded-lg transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
