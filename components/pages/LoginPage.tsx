"use client";

import { ArrowLeft, Star, UserPlus, Wallet, Zap } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";
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
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-title font-black tracking-tight text-brand-strong transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>{t("auth.login.home")}</span>
          </Link>
          <span className="text-caption text-muted-fg">Secure sign-in</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-16">
        {/* Sign-in card comes first on mobile for zero-scroll access */}
        <section className="flex items-center justify-center lg:order-2 lg:col-span-5">
          <Card className="w-full max-w-md p-6 shadow-card sm:p-8">
            <div className="text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                <Zap className="size-7" fill="currentColor" aria-hidden="true" />
              </span>
              <h1 className="text-heading font-black tracking-tight text-fg [text-wrap:balance]">
                {t("auth.login.subheading")}
              </h1>
              {reservedUsername && (
                <p className="mt-2 text-label font-medium text-brand-strong">
                  Claiming agaseke.me/{reservedUsername}
                </p>
              )}
            </div>

            <div className="mt-7">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                leadingIcon={
                  <span className="flex size-6 items-center justify-center rounded-pill bg-surface">
                    <FcGoogle className="size-4 shrink-0" aria-hidden="true" />
                  </span>
                }
                onClick={signIn}
              >
                {t("auth.login.cta")}
              </Button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-control bg-danger-bg p-3 text-center text-caption text-danger"
              >
                {t("auth.login.signInError")}
              </p>
            )}

            <p className="mt-6 text-center text-caption leading-relaxed text-muted-fg">
              {t("auth.login.agreementBefore")}{" "}
              <Link href="/terms" className="font-medium text-fg underline">
                {t("auth.login.terms")}
              </Link>{" "}
              {t("auth.login.agreementMiddle")}{" "}
              <Link href="/privacy" className="font-medium text-fg underline">
                {t("auth.login.privacy")}
              </Link>
              {t("auth.login.agreementAfter")}
            </p>
          </Card>
        </section>

        <section className="flex flex-col justify-center rounded-card border border-line bg-surface-sunken p-6 sm:p-10 lg:order-1 lg:col-span-7">
          <h2 className="text-display font-black leading-tight text-fg sm:text-hero [text-wrap:balance]">
            {t("auth.login.promise")}
          </h2>

          <div className="mt-8 space-y-6">
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

          <p className="mt-8 border-t border-line pt-6 text-caption text-muted-fg">
            {t("auth.login.footer")}
          </p>
        </section>
      </main>
    </div>
  );
}
