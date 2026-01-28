"use client";

import React from "react";
import {
  Wallet,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const CreatorSpace = () => {
  const { profile, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const publicLink = `ndafana.rw/${profile?.username}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLink);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="bg-white border-b border-slate-200 pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                My Space
              </h1>
              <p className="text-slate-500 font-medium">
                Welcome back, {profile?.displayName?.split(" ")[0]}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-600">
                  {publicLink}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-600"
                >
                  <Copy size={16} />
                </button>
              </div>
              <a
                href={`/${profile?.username}`}
                className="p-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all"
              >
                <ExternalLink size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 mt-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Wallet & Stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* Wallet Card */}
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
              <div className="relative z-10 flex justify-between items-start mb-12">
                <div>
                  <p className="text-indigo-100 font-bold mb-1 opacity-80 uppercase tracking-widest text-xs">
                    Available Balance
                  </p>
                  <h2 className="text-5xl font-black">
                    {profile?.balance?.toLocaleString() || 0}{" "}
                    <span className="text-2xl font-medium">RWF</span>
                  </h2>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Wallet size={24} />
                </div>
              </div>

              <div className="relative z-10 flex gap-4">
                <button className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg">
                  Withdraw to MoMo
                </button>
                <button className="px-6 py-4 bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-400 transition-all border border-indigo-400">
                  History
                </button>
              </div>

              {/* Decorative circle */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp size={20} />
                </div>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                  Total Earned
                </p>
                <p className="text-2xl font-black text-slate-900">
                  120,400 RWF
                </p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Users size={20} />
                </div>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                  Supporters
                </p>
                <p className="text-2xl font-black text-slate-900">42</p>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">
                  Recent Supporters
                </h3>
                <button className="text-indigo-600 font-bold text-sm">
                  View all
                </button>
              </div>

              <div className="space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden" />
                      <div>
                        <p className="font-bold text-slate-900">Fan Name</p>
                        <p className="text-xs text-slate-400 font-medium italic">
                          {`"Keep up the great work!"`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">+ 5,000 RWF</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1 justify-end">
                        <Clock size={10} /> 2h ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar / Tips */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h4 className="font-black text-slate-900 mb-4">Creator Tips</h4>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <ArrowUpRight size={14} /> Boost Earnings
                  </p>
                  <p className="text-sm text-amber-900 font-medium">
                    Creators who share their link on Instagram stories earn 4x
                    more.
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1">
                    <TrendingUp size={14} /> New Feature
                  </p>
                  <p className="text-sm text-indigo-900 font-medium">
                    You can now lock exclusive content for supporters only.
                  </p>
                </div>
              </div>
            </div>

            {/* Payout Information */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
              <h4 className="font-black mb-4">Payout Method</h4>
              <div className="flex items-center gap-3 mb-6 bg-white/10 p-4 rounded-2xl border border-white/10">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-black text-slate-900 text-xs text-center leading-none">
                  MTN
                  <br />
                  MOMO
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    Primary Number
                  </p>
                  <p className="text-sm font-bold">078****892</p>
                </div>
              </div>
              <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">
                Change Number
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatorSpace;
