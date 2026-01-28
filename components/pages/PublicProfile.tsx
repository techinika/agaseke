"use client";

import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Send,
} from "lucide-react";

const PublicProfile = ({ creator }) => {
  const [amount, setAmount] = useState(2000);
  const [message, setMessage] = useState("");
  const presets = [1000, 2000, 5000, 10000];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-blue-100">

      <main className="max-w-5xl mx-auto px-6 pt-8 pb-24 grid md:grid-cols-12 gap-12">
        {/* LEFT COLUMN: Creator Bio & Social Proof */}
        <div className="md:col-span-5 space-y-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-[2.5rem] bg-blue-600 p-1">
              <div className="w-full h-full rounded-[2.3rem] bg-white overflow-hidden border-4 border-white shadow-xl">
                {/* Replace with creator.photoURL */}
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Achille"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-2xl shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">
              Achille Songa
            </h1>
            <p className="text-blue-600 font-bold mb-4">@achille</p>
            <p className="text-slate-600 leading-relaxed text-lg">
              Creating weekly deep-dives into Rwandan tech and storytelling.
              Your support helps me keep the cameras rolling and the stories
              coming! 🇷🇼
            </p>
          </div>

          {/* Social Proof Stats */}
          <div className="flex gap-8 border-y border-slate-100 py-6">
            <div>
              <p className="text-2xl font-black text-slate-900">142</p>
              <p className="text-sm font-medium text-slate-400">Supporters</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">28</p>
              <p className="text-sm font-medium text-slate-400">
                Exclusive Posts
              </p>
            </div>
          </div>

          {/* Recent Supporters (List) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Recent Cheers
            </h3>
            {[
              { name: "Kelia G.", amount: "5,000 RWF", note: "Keep it up!" },
              {
                name: "John Doe",
                amount: "2,000 RWF",
                note: "Love the last video.",
              },
            ].map((cheer, i) => (
              <div
                key={i}
                className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div>
                  <p className="text-sm font-bold">
                    <span className="text-blue-600">{cheer.name}</span>{" "}
                    supported with {cheer.amount}
                  </p>
                  <p className="text-sm text-slate-500 italic">
                    "{cheer.note}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Support Card */}
        <div className="md:col-span-7">
          <div className="sticky top-24 bg-white border border-slate-100 rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-blue-100/50">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              Support <span className="text-blue-600 italic">Achille</span>{" "}
              <Heart className="fill-blue-600 text-blue-600" size={24} />
            </h2>

            <div className="space-y-8">
              {/* Amount Selection */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Select Amount (RWF)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAmount(p)}
                      className={`py-3 px-4 rounded-2xl font-bold transition-all border-2 ${
                        amount === p
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="mt-4 relative">
                  <input
                    type="number"
                    placeholder="Custom Amount"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 font-bold transition-all"
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    RWF
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageCircle size={14} /> Leave a message (Optional)
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-medium resize-none"
                  placeholder="Say something nice..."
                  rows={2}
                />
              </div>

              {/* Payment Button */}
              <button className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex items-center justify-center gap-3">
                <Send size={22} /> Support with MoMo
              </button>

              {/* Payment Methods Info */}
              <div className="flex items-center justify-center gap-6 opacity-40">
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Smartphone size={14} /> MTN MoMo
                </div>
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Smartphone size={14} /> Airtel Money
                </div>
              </div>
            </div>
          </div>
          <p className="text-center mt-8 text-sm text-slate-400 font-medium">
            Security by{" "}
            <span className="text-slate-600">ndafana SecurePay</span> 🔒
          </p>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;
