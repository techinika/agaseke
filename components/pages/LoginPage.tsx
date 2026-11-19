"use client";

import { Zap, Wallet, Star, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import { PerkItem } from "./loginpage/index";
import { sanitizeRedirectPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { t } from "@/lib/i18n";

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
  const [error, setError] = React.useState(false);
  const redirect = sanitizeRedirectPath(redirectParam || getFallbackRedirect());

  const signIn = async () => {
    setLoading(true);
    setError(false);
    try {
      const { handleGoogleLogin } = await import("@/db/functions/GoogleLogin");
      await handleGoogleLogin(
        reservedUsername ?? null,
        referralCreator ?? null,
        redirect,
      );
    } catch (signInError) {
      console.error(signInError);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col-reverse bg-canvas lg:flex-row">
      <section className="relative flex flex-col justify-between overflow-hidden border-b border-line bg-surface-sunken p-6 sm:p-10 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-16">
        <div className="pointer-events-none absolute -right-32 -top-32 size-64 rounded-pill bg-brand/10 blur-3xl" />

        <div>
          <Link
            href="/"
            className="mb-12 inline-flex min-h-12 items-center gap-2 text-title font-bold text-brand-strong transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("auth.login.home")}
          </Link>

          <h1 className="text-display font-black leading-tight text-fg sm:text-hero">
            {t("auth.login.promise")}
          </h1>

          <div className="mt-10 space-y-8">
            <PerkItem
              icon={<Wallet className="size-5" aria-hidden="true" />}
              title={t("auth.login.walletTitle")}
              desc={t("auth.login.walletBody")}
            />
            <PerkItem
              icon={<Star className="size-5" aria-hidden="true" />}
              title={t("auth.login.favoritesTitle")}
              desc={t("auth.login.favoritesBody")}
            />
            <PerkItem
              icon={<UserPlus className="size-5" aria-hidden="true" />}
              title={t("auth.login.createTitle")}
              desc={t("auth.login.createBody")}
            />
          </div>
        </div>

        <p className="mt-12 border-t border-line pt-8 text-caption text-muted-fg">
          {t("auth.login.footer")}
        </p>
      </section>

      <section className="flex items-center justify-center bg-canvas p-6 sm:p-8 lg:w-1/2">
        <Card className="w-full max-w-sm p-6 text-center shadow-card sm:p-10">
          <div className="mb-8">
            <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
              <Zap className="size-8" fill="currentColor" aria-hidden="true" />
            </span>
            <h2 className="text-heading font-bold text-fg">
              {t("auth.login.subheading")}
            </h2>
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
            onClick={signIn}
          >
            {t("auth.login.cta")}
          </Button>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-control bg-danger-bg p-3 text-caption text-danger"
            >
              {t("auth.login.signInError")}
            </p>
          )}

          <p className="mt-8 px-2 text-caption leading-relaxed text-muted-fg">
            {t("auth.login.agreementBefore")}
            <Link
              href="/terms"
              className="mx-1 inline-flex min-h-12 items-center underline"
            >
              {t("auth.login.terms")}
            </Link>
            {t("auth.login.agreementMiddle")}
            <Link
              href="/privacy"
              className="mx-1 inline-flex min-h-12 items-center underline"
            >
              {t("auth.login.privacy")}
            </Link>
            {t("auth.login.agreementAfter")}
          </p>
        </Card>
      </section>
    </div>
  );
}
