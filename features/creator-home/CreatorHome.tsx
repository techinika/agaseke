"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Users,
  Clock,
  FileText,
  Share2,
  AlertCircle,
  ChevronRight,
  Heart,
  Check,
} from "lucide-react";
import { useCreatorHome } from "./hooks/useCreatorHome";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const LOADING_COUNT = 4;

export function CreatorHome() {
  const { creator, stats, supports, loading, error, refetch } = useCreatorHome();
  const unverified = creator && !creator.verified;
  const currency = stats?.currency || "RWF";

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-24">
        <Skeleton className="h-10 w-1/3" rounded="full" />
        <div className="mt-6 grid gap-3">
          {Array.from({ length: LOADING_COUNT }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/6" />
              </div>
              <Skeleton className="h-8 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-24 text-center">
        <EmptyState
          title={t("creatorHome.loadErrorTitle")}
          description={t("creatorHome.loadErrorBody")}
          action={
            <Button variant="ghost" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-24">
      {unverified && (
        <Card className="border-warning border-2 bg-warning-bg/50 p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-bold text-warning">
              {t("creatorHome.verificationRequired")}
            </p>
            <p className="mt-1 text-label text-muted-fg">
              {t("creatorHome.verificationHint")}
            </p>
            <Link
              href="/creator/verify"
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-label font-semibold text-brand-strong hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
            >
              {t("creatorHome.verifyNow")}{" "}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <Card className="p-4 border-success/20">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-muted-fg">
              {t("creatorHome.availableBalance")}
            </p>
            <Wallet className="size-5 text-success" aria-hidden="true" />
          </div>
          <div className="mt-1">
            <Money
              value={stats?.pending ?? 0}
              currency={currency}
              className="text-body-lg font-bold text-fg tabular-nums"
            />
          </div>
          <Link
            href="/creator/payouts"
            className="mt-auto inline-flex min-h-10 items-center gap-1 rounded-control border border-transparent px-2 py-1 text-caption font-semibold text-brand-strong hover:bg-surface-raised hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="p-4 border-brand-strong/20">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-muted-fg">
              {t("creatorHome.earningsThisMonth")}
            </p>
            <TrendingUp className="size-5 text-brand-strong" aria-hidden="true" />
          </div>
          <div className="mt-1">
            <Money
              value={stats?.totalEarnings ?? 0}
              currency={currency}
              className="text-body-lg font-bold text-fg tabular-nums"
            />
          </div>
          <Link
            href="/creator/payouts"
            className="mt-auto inline-flex min-h-10 items-center gap-1 rounded-control border border-transparent px-2 py-1 text-caption font-semibold text-brand-strong hover:bg-surface-raised hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="p-4 border-info/20">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-muted-fg">
              {t("creatorHome.supporters")}
            </p>
            <Users className="size-5 text-info" aria-hidden="true" />
          </div>
          <div className="mt-1">
            <span className="text-body-lg font-bold text-fg tabular-nums">
              {stats?.supporters?.toLocaleString() ?? "0"}
            </span>
          </div>
          <Link
            href="/creator/supporters"
            className="mt-auto inline-flex min-h-10 items-center gap-1 rounded-control border border-transparent px-2 py-1 text-caption font-semibold text-brand-strong hover:bg-surface-raised hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="p-4 border-info/20">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-muted-fg">
              {t("creatorHome.nextPayout")}
            </p>
            <Clock className="size-5 text-info" aria-hidden="true" />
          </div>
          <div className="mt-1">
            <span className="text-body-lg font-bold text-fg">
              {stats?.hasPayout
                ? t("creatorHome.payoutScheduled")
                : t("creatorHome.noPayoutYet")}
            </span>
          </div>
          <Link
            href="/creator/payouts"
            className="mt-auto inline-flex min-h-10 items-center gap-1 rounded-control border border-transparent px-2 py-1 text-caption font-semibold text-brand-strong hover:bg-surface-raised hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="text-title font-bold text-fg mb-4 flex items-center gap-2">
          <Heart className="size-5 text-brand-strong" aria-hidden="true" />
          {t("creatorHome.recentSupports")}
        </h2>
        {supports.length === 0 ? (
          <EmptyState
            title={t("creatorHome.noSupportsYet")}
            description={t("creatorHome.noSupportsBody")}
            action={
              <Button
                variant="primary"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    void navigator.share({
                      title: creator?.name || "Agaseke Creator",
                      text: `Support ${creator?.name} on Agaseke`,
                      url: `https://agaseke.me/${creator?.handle}`,
                    });
                  }
                }}
              >
                {t("creatorHome.shareLink")}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {supports.map((support) => (
              <Card key={support.id} className="p-3 flex items-center gap-3">
                <Avatar
                  src={support.anonymous ? null : undefined}
                  name={support.name}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-fg truncate">
                    {support.name}
                  </p>
                  <p className="text-caption text-muted-fg truncate">
                    {support.anonymous
                      ? t("creatorHome.anonymousLabel")
                      : t("creatorHome.supportedYou")}
                  </p>
                </div>
                <Money
                  value={support.amount}
                  currency={support.currency}
                  className="font-bold text-fg"
                />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-title font-bold text-fg mb-4">
          {t("creatorHome.nextSteps")}
        </h2>
        <div className="space-y-2">
          {[
            {
              label: t("creatorHome.addPost"),
              hint: t("creatorHome.addPostHint"),
              href: "/creator/content",
              icon: <FileText className="size-5" aria-hidden="true" />,
            },
            {
              label: t("creatorHome.shareLink"),
              hint: t("creatorHome.shareLinkHint"),
              href: "#",
              icon: <Share2 className="size-5" aria-hidden="true" />,
              onClick: () => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  void navigator.share({
                    title: creator?.name || "Agaseke Creator",
                    text: `Support ${creator?.name} on Agaseke`,
                    url: `https://agaseke.me/${creator?.handle}`,
                  });
                }
              },
            },
            {
              label: t("creatorHome.verify"),
              hint: t("creatorHome.verifyHint"),
              href: "/creator/verify",
              icon: <AlertCircle className="size-5" aria-hidden="true" />,
            },
          ].map((action) => {
            const isShare = action.href === "#";
            return (
              <div
                key={action.label}
                className="rounded-card border border-line bg-surface p-3"
              >
                {isShare ? (
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="flex w-full items-center justify-between gap-3 text-left transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-outline"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-strong/10 text-brand-strong">
                        {action.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-fg">{action.label}</p>
                        <p className="text-caption text-muted-fg">{action.hint}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-fg"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <Link
                    href={action.href}
                    className="flex w-full items-center justify-between gap-3 text-left transition-colors hover:bg-surface-raised hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-outline border-brand-strong/20 border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-strong/10 text-brand-strong">
                        {action.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-fg">{action.label}</p>
                        <p className="text-caption text-muted-fg">{action.hint}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-fg"
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-title font-bold text-fg mb-4">
          {t("creatorHome.setupChecklist")}
        </h2>
        <Card className="p-4 space-y-3">
          {[
            {
              key: "photo",
              label: t("creatorHome.checkPhoto"),
              done: Boolean(creator?.profilePicture),
              href: "/onboarding",
            },
            {
              key: "bio",
              label: t("creatorHome.checkBio"),
              done: Boolean(creator?.bio),
              href: "/onboarding",
            },
            {
              key: "payout",
              label: t("creatorHome.checkPayout"),
              done: Boolean(creator?.payoutNumber),
              href: "/onboarding",
            },
            {
              key: "verify",
              label: t("creatorHome.checkVerify"),
              done: Boolean(creator?.verified),
              href: "/creator/verify",
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    item.done
                      ? "bg-success-bg text-success"
                      : "bg-surface-raised text-muted-fg",
                  )}
                  aria-hidden="true"
                >
                  {item.done ? <Check className="size-4" aria-hidden="true" /> : null}
                </span>
                <span className="text-body font-semibold text-fg truncate">
                  {item.label}
                </span>
              </div>
              <span
                className={cn(
                  "text-caption font-semibold shrink-0",
                  item.done ? "text-success" : "text-muted-fg",
                )}
              >
                {item.done ? t("creatorHome.checkDone") : t("creatorHome.checkTodo")}
              </span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
