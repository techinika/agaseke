"use client";

import React from "react";
import {
  Heart,
  Wallet,
  Search,
  Unlock,
  History,
  Star,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const SupporterSpace = () => {
  const { profile, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="bg-white border-b border-slate-200 pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                My Support
              </h1>
              <p className="text-slate-500 font-medium">
                You’ve supported **12 creators** this month. Legend! 🇷🇼
              </p>
            </div>

            <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Search size={18} />
              <span>Find more creators</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Wallet & Following */}
          <div className="lg:col-span-2 space-y-8">
            {/* Supporter Wallet Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-xl shadow-indigo-50 relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-slate-400 font-bold mb-1 uppercase tracking-widest text-xs">
                    My Balance
                  </p>
                  <h2 className="text-4xl font-black text-slate-900">
                    {profile?.supporterBalance?.toLocaleString() || 0}{" "}
                    <span className="text-xl font-medium">RWF</span>
                  </h2>
                </div>
                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200">
                  <Wallet size={24} />
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">
                  Deposit via MoMo
                </button>
                <button className="px-6 py-4 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                  <History size={20} />
                </button>
              </div>
            </div>

            {/* Creators I Support */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={20} /> My
                Favorites
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "Meddy", role: "Musician", link: "/meddy" },
                  { name: "Achille", role: "Tech Content", link: "/achille" },
                ].map((creator, i) => (
                  <div
                    key={i}
                    className="group p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-indigo-200 hover:bg-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold">
                        {creator.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {creator.name}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {creator.role}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-slate-300 group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Unlocked Content Feed */}
          <div className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
              <h4 className="font-black mb-6 flex items-center gap-2 text-indigo-400">
                <Unlock size={20} /> Unlocked Content
              </h4>

              <div className="space-y-6">
                {[
                  { title: "New Song Demo", from: "Meddy", time: "1d ago" },
                  {
                    title: "Private Gear List",
                    from: "Achille",
                    time: "3d ago",
                  },
                ].map((post, i) => (
                  <div
                    key={i}
                    className="border-b border-white/10 pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter mb-1">
                      {post.from}
                    </p>
                    <h5 className="font-bold text-sm mb-2">{post.title}</h5>
                    <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                      View Post
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Loyalty / Rewards Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
              <Star className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
              <h4 className="font-black mb-2 relative z-10">Fan Level: Gold</h4>
              <p className="text-sm text-indigo-100 mb-6 relative z-10">
                Support 3 more creators to reach Platinum status!
              </p>
              <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                <div className="bg-white h-full w-[70%]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupporterSpace;
