"use client";

import React, { useState } from "react";
import {
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  LogIn,
} from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  // Simulated Auth State for previewing
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Simulated User Data
  const user = {
    displayName: "Gisa Patrick",
    photoURL: null,
    email: "gisa@example.com",
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center justify-between px-6 py-3.5 mx-auto max-w-7xl">
        {/* --- Logo --- */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="text-xl font-black tracking-tighter text-slate-900 uppercase">
            agaseke<span className="text-orange-600">.me</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <button
              onClick={() => setIsLoggedIn(true)}
              className="group relative flex items-center gap-2 px-6 py-2.5 bg-orange-700 text-white rounded-2xl text-sm font-bold hover:bg-orange-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors"
              >
                Go to Space <ArrowUpRight size={14} />
              </Link>

              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-white transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden font-bold text-xs ring-2 ring-transparent group-hover:ring-orange-100 transition-all">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-600">
                        {user.displayName[0]}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Creator
                    </span>
                    <span className="text-xs font-black text-slate-800">
                      {user.displayName}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-300 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-white rounded-4xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 mb-2">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">
                        Your Account
                      </p>
                      <p className="text-xs font-bold text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <LayoutDashboard size={18} /> My Space
                      </Link>
                      <Link
                        href="/profile-settings"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <User size={18} /> Edit Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        <Settings size={18} /> Payout Settings
                      </Link>
                    </div>

                    <div className="h-px bg-slate-50 my-2 mx-4" />

                    <button
                      onClick={() => setIsLoggedIn(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 rounded-2xl hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
