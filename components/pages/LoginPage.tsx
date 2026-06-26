"use client";

import { Zap, Wallet, Star, UserPlus, ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import React from "react";
import { PerkItem } from "./loginpage/index";
import { handleGoogleLogin } from "../../db/functions/GoogleLogin";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

function getFallbackRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("login_redirect");
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservedUsername = searchParams.get("username") || null;
  const referralCreator = searchParams.get("referral") || null;
  const redirect = searchParams.get("redirect") || getFallbackRedirect();

  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirect || "/");
    }
  }, [user, authLoading, redirect, router]);

  return (
    <div className="min-h-screen bg-card flex flex-wrap-reverse md:flex-row">
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
              title="Create your Agaseke"
              desc="Set up your own agaseke.me/name and start receiving support instantly."
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-muted-foreground text-sm">
          © 2026 Agaseke. Supporting Rwandan Creativity.
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 bg-muted">
        <div className="w-full max-w-sm bg-card p-10 rounded-lg shadow-xl shadow-border-strong/50 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to manage your Agaseke
            </p>
          </div>

          <button
            className="w-full flex items-center justify-center gap-3 bg-card border-2 border-border py-4 px-6 rounded-lg font-bold text-foreground hover:bg-muted hover:border-border-strong transition-all active:scale-[0.98]"
            onClick={async () => {
              setLoading(true);
              await handleGoogleLogin(reservedUsername ?? null, referralCreator ?? null, redirect);
              setLoading(false);
            }}
          >
            {loading ? (
              <Loader className="animate-spin" />
            ) : (
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                className="w-5 h-5"
                alt="Google"
              />
            )}
            Continue with Google
          </button>

          <p className="mt-8 text-xs text-muted-foreground leading-relaxed px-4">
            By continuing, you agree to Agaseke&apos;s
            <Link href="/terms" className="underline mx-1">
              Terms of Service
            </Link>
            and
            <Link href="/privacy" className="underline mx-1">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}


