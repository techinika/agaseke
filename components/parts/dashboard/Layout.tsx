/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Plus,
  Calendar,
  MessageSquare,
  Wallet,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {creator} = useAuth();
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const copyLink = () => {
    if (!creator?.handle) return;
    navigator.clipboard.writeText(`agaseke.me/${creator.handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-bold tracking-tight uppercase">agaseke.me</span>
          </Link>

          <nav className="space-y-1">
            <NavItem
              href="/creator"
              icon={<BarChart3 size={18} />}
              label="Overview"
              active={pathname === "/creator"}
            />
            <NavItem
              href="/creator/content"
              icon={<Plus size={18} />}
              label="Content"
              active={pathname === "/creator/content"}
            />
            <NavItem
              href="/creator/gatherings"
              icon={<Calendar size={18} />}
              label="Gatherings"
              active={pathname === "/creator/gatherings"}
            />
            <NavItem
              href="/creator/messages"
              icon={<MessageSquare size={18} />}
              label="Messages"
              active={pathname === "/creator/messages"}
            />
            <NavItem
              href="/creator/payouts"
              icon={<Wallet size={18} />}
              label="Payouts"
              active={pathname === "/creator/payouts"}
            />
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
            agaseke.me/{creator?.handle || "..."}
          </p>
          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition">
            Share Page <Share2 size={12} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h2 className="text-sm font-semibold text-slate-600 capitalize">
            {pathname.split("/").pop() === "dashboard"
              ? "Overview"
              : pathname.split("/").pop()}
          </h2>
          <div className="flex items-center gap-4">
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-700 transition shadow-sm">
              <Plus size={16} /> Create New
            </button>
            <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold overflow-hidden">
              {creator?.photoURL ? (
                <img src={creator.photoURL} alt="" />
              ) : (
                creator?.name?.[0] || "G"
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, href, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-orange-50 text-orange-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon} {label}
    </Link>
  );
}
