"use client";

import React, { useState } from "react";
import {
  User,
  Settings,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  PlusCircle,
  Repeat,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";

const Navbar = () => {
  const { user, isLoggedIn } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white backdrop-blur-xl border-b border-white/20 transition-all duration-300 border-b-slate-300 shadow-b-2">
        <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-2xl font-bold tracking-tighter text-slate-900 group-hover:opacity-90 transition-opacity">
              agaseke<span className="text-orange-600">.rw</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/start"
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-orange-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <PlusCircle size={18} />
                  <span>Start my page</span>
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-orange-600 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium text-slate-400">
                      Hello,
                    </span>
                    <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                      {user?.displayName || "Creator"}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-300 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 ring-1 ring-slate-900/5 py-2 animate-in fade-in slide-in-from-top-2 origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100/50 mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Active Profile
                      </p>
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-orange-600 text-sm">
                          Creator Account
                        </span>
                        <button className="flex items-center gap-1.5 text-[10px] bg-white px-2 py-1 rounded-lg text-slate-600 border border-slate-200 shadow-sm hover:text-orange-600 hover:border-blue-200 transition-all">
                          <Repeat size={10} /> Switch
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5 px-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-blue-50 hover:text-orange-600 transition-colors"
                      >
                        <LayoutDashboard size={18} /> Manage Dashboard
                      </Link>
                      <Link
                        href="/transactions"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-blue-50 hover:text-orange-600 transition-colors"
                      >
                        <CreditCard size={18} /> Transactions
                      </Link>
                      <Link
                        href="/content"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-blue-50 hover:text-orange-600 transition-colors"
                      >
                        <Settings size={18} /> Settings
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-2 mx-4" />

                    <div className="px-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 transition-colors">
                        <LogOut size={18} /> Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {!isLoggedIn && (
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors"
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden animate-in slide-in-from-top-10 fade-in duration-200">
          <div className="flex flex-col gap-4">
            {!isLoggedIn ? (
              <Link
                href="/start"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-4 bg-orange-600 text-white rounded-xl text-center font-bold text-lg shadow-xl shadow-blue-200"
              >
                Start my page
              </Link>
            ) : (
              // Add mobile logged in links here if needed, for now just keeping it simple
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-4 bg-slate-100 text-slate-900 rounded-xl text-center font-bold text-lg"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
