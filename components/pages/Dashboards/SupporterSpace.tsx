"use client";

import React from "react";
import {
  Search,
  Lock,
  ArrowRight,
  Zap,
  User,
  Star,
  Clock,
} from "lucide-react";

export default function SupporterSpace() {
  const totalImpact = 15500; // RWF
  const creatorsCount = 2;

  const supportedCreators = [
    {
      name: "Gisa Ishimwe",
      updates: 2,
      lastPost: "New digital illustration process",
      time: "2h ago",
    },
    {
      name: "Angelic K.",
      updates: 0,
      lastPost: "Kigali Jazz night invitation",
      time: "1d ago",
    },
  ];

  const suggestedCreators = [
    {
      name: "Cédric S.",
      bio: "Architectural photographer exploring Kigali's hidden corners.",
      handle: "cedric",
    },
    {
      name: "Peace M.",
      bio: "Cooking traditional Rwandan recipes with a modern twist.",
      handle: "peace",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-20 font-sans">
      {/* --- Navigation --- */}
      <nav className="px-6 py-4 flex justify-between items-center max-w-5xl mx-auto bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="text-xl font-bold text-orange-600 tracking-tight">
          agaseke<span className="text-slate-400">.me</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-bold text-slate-600 hover:text-orange-600 transition">
            Explore
          </button>
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 border-2 border-white shadow-sm">
            <User size={20} />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-10">
        {/* --- Supporter Stats & Impact --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-black mb-2">
                Amahoro, Supporter!
              </h1>
              <p className="text-slate-500">
                Your contribution is fueling Rwandan creativity.
              </p>
            </div>
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Total Support
                </p>
                <p className="text-2xl font-black text-orange-600">
                  {totalImpact.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    RWF
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Creators Helped
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {creatorsCount}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between group cursor-pointer hover:bg-slate-800 transition-all"
            onClick={() => (window.location.href = "/onboarding")}
          >
            <div className="bg-orange-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap size={20} fill="white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Become a Creator</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Start receiving support via MoMo. Claim your link today.
              </p>
              <div className="flex items-center gap-2 text-orange-500 text-sm font-bold">
                Get Started <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* --- Left Column: Following & Activity --- */}
          <div className="lg:col-span-3 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Star size={20} className="text-orange-500 fill-orange-500" />{" "}
                  My Favorites
                </h3>
              </div>

              <div className="space-y-4">
                {supportedCreators.map((creator, i) => (
                  <div
                    key={i}
                    className="bg-white p-5 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xl">
                        {creator.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900">
                            {creator.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {creator.time}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                          {creator.lastPost}
                        </p>
                      </div>
                      {creator.updates > 0 && (
                        <div className="bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-bounce">
                          {creator.updates} NEW
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* --- Right Column: Discovery --- */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                Discover Creators
              </h3>

              <div className="relative mb-6">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition"
                />
              </div>

              <div className="space-y-6">
                {suggestedCreators.map((c, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-orange-600 transition">
                          @{c.handle}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          {c.bio}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="w-full py-3 text-xs font-bold text-slate-400 border-2 border-dashed border-slate-100 rounded-xl hover:bg-slate-50 transition">
                  View More Creators
                </button>
              </div>
            </section>

            {/* Locked Content Card */}
            <div className="p-6 bg-slate-50 rounded-[2rem] text-center border border-slate-100">
              <Lock size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Premium Space
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Support more creators to unlock their private libraries.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
