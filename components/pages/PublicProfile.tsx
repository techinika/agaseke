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
} from "lucide-react";

export default function PublicProfile() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const creator = {
    name: "Gisa Ishimwe",
    bio: "Digital artist and storyteller based in Kigali. I create traditional-inspired digital illustrations.",
    socials: { twitter: "#", instagram: "#", web: "#" },
    perks: [
      {
        id: 1,
        title: "Behind the Scenes",
        desc: "Access to my process videos",
      },
      {
        id: 2,
        title: "Exclusive Prints",
        desc: "Monthly high-res digital downloads",
      },
    ],
    events: [
      {
        title: "Art Workshop: Kigali Heights",
        date: "Feb 12, 2026",
        type: "Private Gathering",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20 font-sans selection:bg-orange-100">
      <div className="max-w-2xl mx-auto pt-16 px-6 text-center">
        <div className="w-24 h-24 bg-orange-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white shadow-sm">
          <User size={40} className="text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          {creator.name}{" "}
          <CheckCircle2
            size={20}
            className="text-blue-500 fill-blue-500 text-white"
          />
        </h1>
        <p className="text-slate-600 mb-6 leading-relaxed">{creator.bio}</p>

        {/* Social Links */}
        <div className="flex justify-center gap-4 mb-10">
          <SocialIcon
            icon={<Instagram size={20} />}
            link={creator.socials.instagram}
          />
          <SocialIcon
            icon={<Twitter size={20} />}
            link={creator.socials.twitter}
          />
          <SocialIcon icon={<Globe size={20} />} link={creator.socials.web} />
        </div>

        {/* Primary Support Button - Triggers Modal */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 mb-12 active:scale-[0.98]"
        >
          Support {creator.name.split(" ")[0]}
        </button>
      </div>

      {/* --- Content Sections --- */}
      <div className="max-w-2xl mx-auto px-6 space-y-8">
        {/* Perks Section */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 font-mono">
            Membership Perks
          </h3>
          <div className="grid gap-4">
            {creator.perks.map((perk) => (
              <div
                key={perk.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-orange-200 transition"
              >
                <div>
                  <h4 className="font-bold text-slate-800">{perk.title}</h4>
                  <p className="text-sm text-slate-500">{perk.desc}</p>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 group-hover:text-orange-500 transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Public Events */}
        {creator.events.map((event, i) => (
          <div
            key={i}
            className="bg-slate-900 text-white p-6 rounded-2xl flex items-center gap-4 shadow-lg shadow-slate-200"
          >
            <div className="bg-slate-800 p-3 rounded-xl">
              <Calendar className="text-orange-400" />
            </div>
            <div>
              <h4 className="font-bold">{event.title}</h4>
              <p className="text-sm text-slate-400">
                {event.date} • {event.type}
              </p>
            </div>
          </div>
        ))}

        {/* Private Content Teaser */}
        <div className="bg-orange-50 border border-orange-100 p-8 rounded-3xl text-center">
          <Lock className="mx-auto mb-4 text-orange-600" size={32} />
          <h3 className="font-bold text-lg mb-2">Unlock Private Content</h3>
          <p className="text-slate-600 text-sm mb-6">
            Join {creator.name.split(" ")[0]}'s inner circle to see exclusive
            posts.
          </p>
          <button className="text-orange-600 font-bold flex items-center gap-2 mx-auto hover:underline">
            Sign in with Google <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* --- Fixed Growth Badge --- */}
      <div className="fixed bottom-6 right-6 z-40">
        <a
          href="/"
          className="bg-white border border-slate-200 shadow-2xl px-4 py-3 rounded-full flex items-center gap-3 hover:scale-105 transition-transform group"
        >
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white">
            <Zap size={14} fill="white" />
          </div>
          <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
            Create your own <span className="text-orange-600">Agaseke</span>
          </span>
        </a>
      </div>

      {/* --- The Support Modal --- */}
      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creator.name}
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function SupportModal({ isOpen, onClose, creatorName }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("input");

  if (!isOpen) return null;

  const handleSupport = () => {
    if (parseInt(amount) < 100) return alert("Minimum support is 100 RWF");
    setStep("processing");
    setTimeout(() => setStep("success"), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-xl">Support {creatorName}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {step === "input" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">
                  Amount (RWF)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Min. 100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-3xl font-bold p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    RWF
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2 font-flex">
                  Message (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Say something nice..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl resize-none outline-none focus:border-orange-500 transition-all text-sm"
                />
              </div>

              <button
                onClick={handleSupport}
                disabled={!amount || parseInt(amount) < 100}
                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-orange-700 disabled:opacity-50 transition-all"
              >
                <Smartphone size={20} /> Pay with MoMo
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <ShieldCheck size={12} /> Encrypted Payment via MoMo
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
              <p className="font-bold text-lg animate-pulse">
                Checking your phone...
              </p>
              <p className="text-sm text-slate-500">
                Confirm the MoMo prompt on your device.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Heart size={40} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Murakoze Cyane!</h3>
                <p className="text-slate-500 mt-2">
                  Your gift of {parseInt(amount).toLocaleString()} RWF has been
                  sent.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialIcon({ icon, link }) {
  return (
    <a
      href={link}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-orange-600 transition shadow-sm"
    >
      {icon}
    </a>
  );
}
