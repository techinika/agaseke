"use client";

import React, { useState } from "react";
import {
  Globe,
  Instagram,
  Twitter,
  Lock,
  Calendar,
  ChevronRight,
  User,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  Heart,
  Zap,
  LogOut,
  LayoutDashboard,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";

export default function PublicProfile() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Simulated auth state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const creator = {
    name: "Gisa Ishimwe",
    handle: "gisa",
    bio: "Digital artist and storyteller based in Kigali. I create traditional-inspired digital illustrations for the modern world.",
    location: "Kigali, Rwanda",
    socials: { twitter: "#", instagram: "#", web: "#" },
    perks: [
      {
        id: 1,
        title: "Process Videos",
        desc: "Watch me sketch from start to finish.",
        type: "Video",
      },
      {
        id: 2,
        title: "High-Res Downloads",
        desc: "Monthly digital wallpapers for your devices.",
        type: "Digital",
      },
    ],
    events: [
      {
        title: "Art Workshop: Kigali Heights",
        date: "Feb 12, 2026",
        type: "In-Person Gathering",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-32 font-sans selection:bg-orange-100">
      {/* --- Dynamic Top Navbar --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link
            href="/"
            className="text-lg font-black tracking-tighter uppercase"
          >
            agaseke<span className="text-orange-600">.me</span>
          </Link>

          <div className="flex items-center gap-4">
            {!isLoggedIn ? (
              <button className="text-sm font-bold text-slate-600 hover:text-orange-600 transition">
                Log In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pr-3 bg-white border border-slate-200 rounded-2xl hover:border-orange-200 transition-all shadow-sm"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-xs text-orange-600">
                    G
                  </div>
                  <span className="text-xs font-black text-slate-700 hidden sm:inline">
                    My Space
                  </span>
                  <ChevronRight
                    size={14}
                    className={`text-slate-300 transition-transform ${isUserMenuOpen ? "rotate-90" : ""}`}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 animate-in zoom-in-95">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-2xl transition-colors"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-2xl transition-colors"
                    >
                      <Settings size={16} /> Profile Settings
                    </Link>
                    <div className="h-px bg-slate-50 my-1 mx-2" />
                    <button
                      onClick={() => setIsLoggedIn(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                      <LogOut size={16} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- Profile Header --- */}
      <div className="relative pt-16">
        {/* Aesthetic Cover */}
        <div className="h-48 w-full bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100" />

        <div className="max-w-2xl mx-auto px-6 -mt-16 text-center">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] p-1 shadow-2xl mx-auto">
              <div className="w-full h-full bg-slate-100 rounded-[2.2rem] flex items-center justify-center">
                <User size={50} className="text-slate-300" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 border-4 border-white rounded-full shadow-lg" />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
            {creator.name}
            <CheckCircle2 size={20} className="text-orange-600" />
          </h1>
          <p className="text-orange-600 font-bold text-sm mb-4 tracking-wide">
            ags.ke/{creator.handle}
          </p>
          <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto mb-8 font-medium">
            {creator.bio}
          </p>

          <div className="flex justify-center gap-3 mb-10">
            <SocialPill icon={<Instagram size={16} />} label="Instagram" />
            <SocialPill icon={<Twitter size={16} />} label="Twitter" />
            <SocialPill icon={<Globe size={16} />} label="Portfolio" />
          </div>

          {/* Huge Sticky-Ready CTA */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="group w-full bg-slate-900 text-white p-2 rounded-[2rem] flex items-center justify-between hover:bg-orange-600 transition-all duration-500 shadow-2xl shadow-orange-100 active:scale-95"
          >
            <div className="flex items-center gap-4 pl-4">
              <div className="bg-white/10 p-3 rounded-2xl group-hover:bg-white/20">
                <Heart
                  size={24}
                  fill="white"
                  className="group-hover:animate-pulse"
                />
              </div>
              <span className="text-xl font-black tracking-tight">
                Support {creator.name.split(" ")[0]}
              </span>
            </div>
            <div className="bg-white/10 group-hover:bg-white text-white group-hover:text-orange-600 px-6 py-4 rounded-[1.8rem] font-black text-sm transition-all uppercase tracking-widest">
              Send Support
            </div>
          </button>
        </div>
      </div>

      {/* --- Page Content Grid --- */}
      <div className="max-w-2xl mx-auto px-6 mt-16 space-y-12">
        {/* Gathering / Events */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Next Gathering
            </h3>
            <div className="h-px bg-slate-100 flex-1 ml-6" />
          </div>
          {creator.events.map((event, i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group hover:border-orange-500 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg">{event.title}</h4>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    {event.date}{" "}
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />{" "}
                    {event.type}
                  </p>
                </div>
              </div>
              <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase group-hover:bg-orange-600 transition-colors">
                Join
              </button>
            </div>
          ))}
        </section>

        {/* Perks Grid */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Member Exclusives
            </h3>
            <div className="h-px bg-slate-100 flex-1 ml-6" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {creator.perks.map((perk) => (
              <div
                key={perk.id}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-orange-900/5 transition group"
              >
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 font-black text-[10px] uppercase">
                  {perk.type}
                </div>
                <h4 className="font-black mb-1">{perk.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {perk.desc}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-orange-600 transition">
                  <Lock size={12} /> Unlock with Support
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Brand */}
        <div className="pt-20 text-center opacity-30 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-slate-400">
            Proudly Powered By
          </p>
          <div className="text-2xl font-black tracking-tighter grayscale">
            agaseke<span className="text-orange-600">.me</span>
          </div>
        </div>
      </div>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creator.name}
      />
    </div>
  );
}

// --- REFINED SUB-COMPONENTS ---

function SocialPill({ icon, label }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:border-orange-500 hover:text-orange-600 hover:shadow-md transition-all">
      {icon} <span>{label}</span>
    </button>
  );
}

// (The SupportModal remains largely the same but with rounded-[3rem] and font-black headers)
function SupportModal({ isOpen, onClose, creatorName }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("input");

  if (!isOpen) return null;

  const handleSupport = () => {
    setStep("processing");
    setTimeout(() => setStep("success"), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
      <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-0 flex justify-between items-center">
          <h3 className="text-3xl font-black tracking-tight">Support Art.</h3>
          <button
            onClick={onClose}
            className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {step === "input" && (
            <div className="space-y-8 text-center">
              <p className="text-slate-500 text-sm font-medium">
                How much would you like to gift {creatorName}?
              </p>

              <div className="relative">
                <input
                  type="number"
                  autoFocus
                  placeholder="0"
                  className="w-full text-center text-7xl font-black text-slate-900 outline-none placeholder:text-slate-100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="block text-xs font-black text-slate-300 mt-4 uppercase tracking-[0.3em]">
                  Rwandan Francs (RWF)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1000", "5000", "10000"].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    className="py-3 bg-slate-50 rounded-2xl text-xs font-black hover:bg-orange-50 hover:text-orange-600 transition"
                  >
                    +{val}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSupport}
                disabled={!amount || parseInt(amount) < 100}
                className="w-full bg-orange-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-4"
              >
                <Smartphone size={24} /> Pay with MoMo
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <ShieldCheck size={12} /> Secure Payment via MTN & Airtel
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-6">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin mx-auto" />
              <h4 className="text-xl font-black">Check your phone...</h4>
              <p className="text-slate-500 font-medium">
                We've sent a MoMo prompt to your device to authorize the
                payment.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={48} fill="currentColor" />
              </div>
              <h4 className="text-3xl font-black">Murakoze Cyane!</h4>
              <p className="text-slate-500 font-medium">
                Your support means the world. A message has been sent to the
                creator.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black"
              >
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
