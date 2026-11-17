"use client";

import { Zap, Wallet, Star, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import { PerkItem } from "./loginpage/index";
import { sanitizeRedirectPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function getFallbackRedirect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("login_redirect");
  } catch {
    return null;
  }
}

type LoginPageProps = {
  reservedUsername?: string | null;
  referralCreator?: string | null;
  redirectParam?: string | null;
};

export default function LoginPage({
  reservedUsername = null,
  referralCreator = null,
  redirectParam = null,
}: LoginPageProps) {
  const [loading, setLoading] = React.useState(false);
  const redirect = sanitizeRedirectPath(redirectParam || getFallbackRedirect());

  return (
    <div className="flex min-h-screen flex-col-reverse bg-canvas lg:flex-row">
      <section className="relative flex flex-col justify-between overflow-hidden border-b border-line bg-surface-sunken p-6 sm:p-10 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-16">
        <div className="pointer-events-none absolute -right-32 -top-32 size-64 rounded-pill bg-brand/10 blur-3xl" />

        <div>
          <Link
            href="/"
            className="mb-12 inline-flex min-h-11 items-center gap-2 text-title font-bold text-brand-strong transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            agaseke.me
          </Link>

          <h1 className="text-display font-black leading-tight text-fg sm:text-hero">
            One account for <br />
            <span className="text-brand-strong">every creator you love.</span>
          </h1>

          <div className="mt-10 space-y-8">
            <PerkItem
              icon={<Wallet className="size-5" aria-hidden="true" />}
              title="Manage your Wallet"
              desc="Track your support history and withdraw your own earnings to MoMo."
            />
            <PerkItem
              icon={<Star className="size-5" aria-hidden="true" />}
              title="Follow your Favorites"
              desc="Get notified when the creators you support post exclusive content."
            />
            <PerkItem
              icon={<UserPlus className="size-5" aria-hidden="true" />}
              title="Create your Agaseke"
              desc="Set up your own agaseke.me/name and start receiving support instantly."
            />
          </div>
        </div>

        <p className="mt-12 border-t border-line pt-8 text-caption text-muted-fg">
          © 2026 Agaseke. Supporting African Creativity.
        </p>
      </section>

      <section className="flex items-center justify-center bg-canvas p-6 sm:p-8 lg:w-1/2">
        <Card className="w-full max-w-sm p-8 text-center shadow-card sm:p-10">
          <div className="mb-8">
            <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
              <Zap className="size-8" fill="currentColor" aria-hidden="true" />
            </span>
            <h2 className="text-heading font-bold text-fg">Welcome Back</h2>
            <p className="mt-2 text-label text-muted-fg">
              Sign in to manage your Agaseke
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            loading={loading}
            leadingIcon={
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={20}
                height={20}
                className="size-5"
                alt=""
                aria-hidden="true"
              />
            }
            onClick={async () => {
              setLoading(true);
              const { handleGoogleLogin } = await import("@/db/functions/GoogleLogin");
              await handleGoogleLogin(
                reservedUsername ?? null,
                referralCreator ?? null,
                redirect,
              );
              setLoading(false);
            }}
          >
            Continue with Google
          </Button>

          <p className="mt-8 px-4 text-caption leading-relaxed text-muted-fg">
            By continuing, you agree to Agaseke&apos;s
            <Link href="/terms" className="mx-1 underline">
              Terms of Service
            </Link>
            and
            <Link href="/privacy" className="mx-1 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Card>
      </section>
    </div>
  );
}
