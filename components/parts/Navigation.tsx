"use client";

import React, { useState } from "react";
import {
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  LogIn,
  Briefcase,
  Search,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { handleLogout } from "@/db/functions/LogOut";
import Loading from "@/app/loading";
import { useRouter, usePathname } from "next/navigation";

const Navbar = () => {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loggingOut) return <Loading />;

  // Helper to highlight active link
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center justify-between px-6 py-3.5 mx-auto container">
        {/* LEFT: Logo & Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-xl font-bold tracking-tighter text-slate-900 uppercase">
              agaseke<span className="text-orange-600">.me</span>
            </div>
          </Link>

          {/* MIDDLE: Primary Links (Hidden on small mobile) */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink
              href="/explore"
              icon={<Search size={14} />}
              label="Explore"
              active={isActive("/explore")}
            />
            <NavLink
              href="/help-center"
              icon={<HelpCircle size={14} />}
              label="Help"
              active={isActive("/help-center")}
            />
            <NavLink
              href="https://medium.com/@agasekeforcreators"
              icon={<BookOpen size={14} />}
              label="Blog"
              isExternal
            />
          </div>
        </div>

        {/* RIGHT: User Actions */}
        <div className="flex items-center gap-3">
          {auth?.user && auth?.isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-lg border border-slate-200 hover:border-orange-200 hover:bg-white transition-all group relative z-50 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden font-bold text-xs ring-2 ring-transparent group-hover:ring-orange-100 transition-all">
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
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {auth?.profile?.type || "User"}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {auth?.profile?.displayName?.split(" ")[0] || "Account"}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-300 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsDropdownOpen(false)}
                    />

                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 z-50">
                      <div className="px-4 py-3 mb-2 bg-slate-50 rounded-lg">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                          Personal Space
                        </p>
                        <p className="text-xs font-bold text-slate-600 truncate">
                          {auth?.user?.email}
                        </p>
                      </div>

                      <div className="space-y-1">
                        {/* Mobile-only links (Hidden on desktop because they are in the navbar) */}
                        <div className="md:hidden border-b border-slate-50 pb-1 mb-1">
                          <DropdownLink
                            href="/explore"
                            icon={<Search size={18} />}
                            label="Explore Creators"
                            onClick={() => setIsDropdownOpen(false)}
                          />
                          <DropdownLink
                            href="/help-center"
                            icon={<HelpCircle size={18} />}
                            label="Help Center"
                            onClick={() => setIsDropdownOpen(false)}
                          />
                        </div>

                        {auth?.isAdmin && (
                          <DropdownLink
                            href="/admin"
                            icon={<Briefcase size={18} />}
                            label="Admin Dashboard"
                            onClick={() => setIsDropdownOpen(false)}
                          />
                        )}

                        <DropdownLink
                          href={auth?.isCreator ? "/creator" : "/supporter"}
                          icon={<LayoutDashboard size={18} />}
                          label="My Workspace"
                          onClick={() => setIsDropdownOpen(false)}
                        />

                        <DropdownLink
                          href="/profile"
                          icon={<User size={18} />}
                          label="Account Settings"
                          onClick={() => setIsDropdownOpen(false)}
                        />
                      </div>

                      <div className="h-px bg-slate-50 my-2 mx-2" />

                      <button
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          setLoggingOut(true);
                          await handleLogout();
                          setLoggingOut(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} /> Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Explore icon visible on mobile for guests */}
              <Link href="/explore" className="md:hidden p-2 text-slate-500">
                <Search size={20} />
              </Link>
              <Link
                href={"/login"}
                className="group relative flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

/* --- Sub-Components to keep code clean --- */

function NavLink({
  href,
  icon,
  label,
  active,
  isExternal,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isExternal?: boolean;
}) {
  const content = (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        active
          ? "text-orange-600 bg-orange-50"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href}>{content}</Link>
  );
}

function DropdownLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
    >
      {icon} {label}
    </Link>
  );
}

export default Navbar;
