"use client";

import { Zap, Wallet, Star, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-slate-900 p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-orange-500 font-bold text-xl mb-12 hover:opacity-80 transition"
          >
            <ArrowLeft size={18} />
            agaseke.me
          </Link>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-8 leading-tight">
            One account for <br />
            <span className="text-orange-500 bg-clip-text bg-linear-to-r from-orange-400 to-orange-600">
              every creator you love.
            </span>
          </h1>

          <div className="space-y-8">
            <PerkItem
              icon={<Wallet className="text-orange-400" />}
              title="Manage your Wallet"
              desc="Track your support history and withdraw your own earnings to MoMo."
            />
            <PerkItem
              icon={<Star className="text-orange-400" />}
              title="Follow your Favorites"
              desc="Get notified when the creators you support post exclusive content."
            />
            <PerkItem
              icon={<UserPlus className="text-orange-400" />}
              title="Create your Link"
              desc="Set up your own ags.ke/name and start receiving support instantly."
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-slate-500 text-sm">
          © 2026 Agaseke. Supporting Rwandan Creativity.
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">
              Sign in to manage your Agaseke
            </p>
          </div>

          <button
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98]"
            onClick={() => {
              console.log("Redirecting to Google Auth...");
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="w-5 h-5"
              alt="Google"
            />
            Continue with Google
          </button>

          <p className="mt-8 text-xs text-slate-400 leading-relaxed px-4">
            By continuing, you agree to Agaseke&apos;s
            <Link href="#" className="underline mx-1">
              Terms of Service
            </Link>
            and
            <Link href="#" className="underline mx-1">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function PerkItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">{icon}</div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
