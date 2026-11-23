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
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const LOADING_COUNT = 4;

export function CreatorHome() {
  const { creator, stats, supports, loading, error, refetch } = useCreatorHome();
  const unverified = creator && !creator.verified;
  const currency = stats?.currency || "";

  const shareCreatorLink = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({
        title: creator?.name || "Agaseke Creator",
        text: `Support ${creator?.name} on Agaseke`,
        url: `https://agaseke.me/${creator?.handle}`,
      });
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t("common.loading")}
        className="mx-auto max-w-2xl px-4 pt-4 pb-24"
      >
        <div className="grid gap-3 md:grid-cols-2 mb-6">
          {Array.from({ length: LOADING_COUNT }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="size-5" rounded="full" />
              </div>
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="mt-4 h-4 w-1/3" />
            </Card>
          ))}
        </div>
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-6 w-40" />
          <Card className="p-3 flex items-center gap-3">
            <Skeleton className="size-9 shrink-0" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-24 text-center">
        <ErrorState
          title={t("creatorHome.loadErrorTitle")}
          description={t("creatorHome.loadErrorBody")}
          onRetry={() => void refetch()}
          retryLabel={t("common.retry")}
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
              href="/creator/settings?tab=verification"
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "mt-3",
              })}
            >
              {t("creatorHome.verifyNow")}{" "}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <Card className="flex flex-col p-4 border-success/20">
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
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-auto gap-1 text-brand-strong",
            })}
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="flex flex-col p-4 border-brand-strong/20">
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
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-auto gap-1 text-brand-strong",
            })}
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="flex flex-col p-4 border-info/20">
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
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-auto gap-1 text-brand-strong",
            })}
          >
            {t("creatorHome.viewDetails")}{" "}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
        <Card className="flex flex-col p-4 border-info/20">
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
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-auto gap-1 text-brand-strong",
            })}
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
              <Button variant="primary" onClick={shareCreatorLink}>
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
              onClick: shareCreatorLink,
            },
            {
              label: t("creatorHome.verify"),
              hint: t("creatorHome.verifyHint"),
              href: "/creator/settings?tab=verification",
              icon: <AlertCircle className="size-5" aria-hidden="true" />,
            },
          ].map((action) => {
            const isShare = action.href === "#";
            const content = (
              <>
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
              </>
            );
            return (
              <Card key={action.label} className="p-3">
                {isShare ? (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={action.onClick}
                    className="w-full justify-between gap-3 text-left"
                  >
                    {content}
                  </Button>
                ) : (
                  <Link
                    href={action.href}
                    className={buttonClasses({
                      variant: "ghost",
                      size: "md",
                      className: "w-full justify-between gap-3 text-left",
                    })}
                  >
                    {content}
                  </Link>
                )}
              </Card>
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
              href: "/creator/settings?tab=verification",
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
              <Badge tone={item.done ? "success" : "neutral"} className="shrink-0">
                {item.done ? t("creatorHome.checkDone") : t("creatorHome.checkTodo")}
              </Badge>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
