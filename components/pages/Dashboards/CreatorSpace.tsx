"use client";

import React, { useState } from "react";
import {
  Wallet,
  Plus,
  Users,
  BarChart3,
  MessageSquare,
  Calendar,
  Eye,
  TrendingUp,
  MoreHorizontal,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

export default function CreatorDashboard() {
  const [balance] = useState(45200);
  const [isVerified] = useState(false); // Link this to your verification logic
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText("ags.ke/gisa");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans text-slate-900">
      {/* --- Sidebar (Workspace Style) --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-bold tracking-tight">agaseke.me</span>
          </div>

          <nav className="space-y-1">
            <NavItem icon={<BarChart3 size={18} />} label="Overview" active />
            <NavItem icon={<Plus size={18} />} label="Content" />
            <NavItem icon={<Calendar size={18} />} label="Gatherings" />
            <NavItem icon={<MessageSquare size={18} />} label="Messages" />
            <NavItem icon={<Wallet size={18} />} label="Payouts" />
          </nav>
        </div>

        <div className="mt-auto p-4 m-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Your Page
            </span>
            {copied ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <button onClick={copyLink}>
                <Copy
                  size={12}
                  className="text-slate-400 hover:text-orange-600"
                />
              </button>
            )}
          </div>
          <p className="text-xs font-medium text-slate-600 truncate mb-3">
            ags.ke/gisa
          </p>
          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition">
            Share Page <Share2 size={12} />
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-slate-600">Dashboard</h2>
          <div className="flex items-center gap-4">
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-700 transition shadow-sm">
              <Plus size={16} /> Create New
            </button>
            <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold">
              G
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Status Banner */}
          {!isVerified && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">
                  Verification required to withdraw funds.
                </span>
              </div>
              <button className="text-xs font-bold bg-amber-200/50 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg transition">
                Verify Now
              </button>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Available
                </p>
                <Wallet size={16} className="text-slate-400" />
              </div>
              <h3 className="text-3xl font-black">
                {balance.toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">RWF</span>
              </h3>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <button className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                  Withdraw <ExternalLink size={12} />
                </button>
                <span className="text-[10px] text-slate-400">
                  MoMo: 078****231
                </span>
              </div>
            </div>

            <StatTile title="Profile Views" value="1,240" change="+12%" />
            <StatTile title="Supporters" value="84" change="+5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp size={16} className="text-orange-500" /> Recent
                  Support
                </h4>
                <button className="text-xs font-bold text-slate-400 hover:text-orange-600 transition">
                  View All
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <ActivityRow name="Innocent K." amount="2,000" time="2m ago" />
                <ActivityRow name="Anonymous" amount="5,000" time="1h ago" />
                <ActivityRow
                  name="Marie-Rose U."
                  amount="10,000"
                  time="3h ago"
                  msg="Love your work!"
                />
                <ActivityRow name="David B." amount="500" time="5h ago" />
              </div>
            </div>

            {/* Past Content Sidebar */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold">Past Activity</h4>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <HistoryItem
                  type="Gathering"
                  title="Street Art Walk"
                  meta="12 people"
                />
                <HistoryItem
                  type="Post"
                  title="Sketchbook V4"
                  meta="45 views"
                />
                <HistoryItem
                  type="Digital"
                  title="Asset Pack"
                  meta="12 sales"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Minimal Components ---

function NavItem({ icon, label, active = false }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
    >
      {icon}
      {label}
    </a>
  );
}

function StatTile({ title, value, change }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">
          {change}
        </span>
      </div>
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
    </div>
  );
}

function ActivityRow({ name, amount, time, msg }) {
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
        {name[0]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            {name}{" "}
            <span className="font-normal text-slate-400 text-xs tracking-tight">
              supported you
            </span>
          </p>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <p className="text-xs font-bold text-orange-600 mt-0.5">{amount} RWF</p>
        {msg && (
          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-md border border-slate-100">
            "{msg}"
          </p>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ type, title, meta }) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-orange-500 transition shadow-sm"></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-orange-600 transition">
          {title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
            {type}
          </span>
          <span className="text-[10px] text-slate-400">{meta}</span>
        </div>
      </div>
    </div>
  );
}
