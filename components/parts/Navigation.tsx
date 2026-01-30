"use client";

import React, { useState } from "react";
import {
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { handleLogout } from "@/db/functions/LogOut";
import Loading from "@/app/loading";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const auth = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loggingOut) return <Loading />;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center justify-between px-6 py-3.5 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="text-xl font-black tracking-tighter text-slate-900 uppercase">
            agaseke<span className="text-orange-600">.me</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {auth?.user && auth?.isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  // REMOVED onBlur - it was closing the menu before the click registered
                  className="flex items-center gap-2 p-1 pr-3 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-white transition-all group relative z-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden font-bold text-xs ring-2 ring-transparent group-hover:ring-orange-100 transition-all">
                    {auth?.profile?.photoURL ? (
                      <img
                        src={auth.profile.photoURL}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-600">
                        {auth?.profile?.displayName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Creator
                    </span>
                    <span className="text-xs font-black text-slate-800">
                      {auth?.profile?.displayName || "User"}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-300 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    {/* FIXED: Transparent backdrop to catch clicks outside the menu */}
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsDropdownOpen(false)}
                    />

                    <div className="absolute right-0 mt-3 w-60 bg-white rounded-4xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 z-50">
                      <div className="px-4 py-3 mb-2">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">
                          Your Account
                        </p>
                        <p className="text-xs font-bold text-slate-500 truncate">
                          {auth?.user?.email}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false); // Close menu on click
                            router.push(
                              auth?.isCreator ? "/creator" : "/supporter",
                            );
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                          <LayoutDashboard size={18} /> My Space
                        </button>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            router.push("/profile");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                          <User size={18} /> Edit Profile
                        </button>
                      </div>

                      <div className="h-px bg-slate-50 my-2 mx-4" />

                      <button
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          setLoggingOut(true);
                          await handleLogout();
                          setLoggingOut(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 rounded-2xl hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} /> Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Link
              href={"/login"}
              className="group relative flex items-center gap-2 px-6 py-2.5 bg-orange-700 text-white rounded-2xl text-sm font-bold hover:bg-orange-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
