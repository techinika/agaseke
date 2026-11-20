"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { getMySubscriptions, type MemberInfo } from "@/lib/communityService";
import { formatCurrency } from "@/types/currency";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { buttonClasses } from "@/components/ui/Button";
import { Crown, ChevronRight } from "lucide-react";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string) {
  const map: Record<string, string> = {
    active: "text-success",
    pending: "text-warning",
    expired: "text-danger",
    cancelled: "text-muted-fg",
    failed: "text-danger",
  };
  return map[status] || "text-muted-fg";
}

export default function CommunityManagePage() {
  const { isLoggedIn } = useAuth();
  const [subs, setSubs] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMySubscriptions()
      .then(setSubs)
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8">
        <p className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
          Memberships
        </p>
        <h1 className="mt-1 text-heading font-bold tracking-tight text-fg">
          Your Subscriptions
        </h1>
        <p className="mt-1 text-label text-muted-fg">
          Renew memberships, update your payment number, or manage auto-renewal.
        </p>
      </div>

      {!isLoggedIn ? (
        <EmptyState
          icon={<Crown className="size-6" aria-hidden="true" />}
          title="Log in to manage subscriptions"
          description="Sign in to see active and past creator memberships."
          action={
            <Link href="/login" className={buttonClasses({ variant: "primary" })}>
              Log in
            </Link>
          }
        />
      ) : loading ? (
        <LoadingState variant="list" label="Loading subscriptions" />
      ) : subs.length === 0 ? (
        <EmptyState
          icon={<Crown className="size-6" aria-hidden="true" />}
          title="No subscriptions yet"
          description="Join a creator's membership tier to unlock members-only posts and chat."
          action={
            <Link href="/explore" className={buttonClasses({ variant: "secondary" })}>
              Explore creators
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => (
            <Link
              key={sub.subscriptionId}
              href={`/community/manage/${sub.subscriptionId}`}
              className="group block"
            >
              <Card className="p-5 transition-colors hover:border-line-strong">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h3 className="text-body font-bold text-fg">{sub.tierName}</h3>
                    <span className={`text-caption font-semibold capitalize ${statusTone(sub.status)}`}>
                      · {sub.status}
                    </span>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-fg transition-transform group-hover:translate-x-0.5 group-hover:text-brand-strong"
                    aria-hidden="true"
                  />
                </div>

                {sub.creatorHandle && (
                  <p className="mb-3 text-caption text-muted-fg">
                    by @{sub.creatorHandle}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-label">
                  <p>
                    <span className="text-caption text-muted-fg">Plan: </span>
                    <span className="font-bold text-brand-strong">
                      {formatCurrency(sub.amount, sub.currency as never)}
                      <span className="ml-1 text-caption font-normal text-muted-fg">
                        /{sub.interval === "yearly" ? "year" : "month"}
                      </span>
                    </span>
                  </p>
                  <p className="text-fg">
                    <span className="text-caption text-muted-fg">
                      {sub.status === "active" ? "Next renewal: " : "Ends: "}
                    </span>
                    {formatDate(sub.expiresAt)}
                  </p>
                  <p>
                    <span className="text-caption text-muted-fg">Auto-renew: </span>
                    <span className={sub.autoRenew ? "font-semibold text-success" : "text-muted-fg"}>
                      {sub.autoRenew ? "On" : "Off"}
                    </span>
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}