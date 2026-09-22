"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { getMySubscriptions, type MemberInfo } from "@/lib/communityService";
import { formatCurrency } from "@/types/currency";
import { Loader, Crown, ChevronRight } from "lucide-react";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    expired: "bg-red-100 text-red-700",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-muted text-muted-foreground";
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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Your Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Renew your memberships, update your payment method, or manage
          auto-renewal.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="text-center py-16">
          <Crown size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Log in to manage your community subscriptions.
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Log in
          </Link>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Crown size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any community subscriptions yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map((sub) => (
            <Link
              key={sub.subscriptionId}
              href={`/community/manage/${sub.subscriptionId}`}
              className="block bg-card border border-border rounded-xl p-5 hover:border-orange-300 transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold">{sub.tierName}</h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge(sub.status)}`}
                  >
                    {sub.status}
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className="text-muted-foreground group-hover:text-orange-500 transition"
                />
              </div>
              {sub.creatorHandle && (
                <p className="text-xs text-muted-foreground mb-3">
                  by @{sub.creatorHandle}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground text-xs">Plan: </span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(sub.amount, sub.currency || "RWF")}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      /{sub.interval === "yearly" ? "year" : "month"}
                    </span>
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground text-xs">
                    {sub.status === "active" ? "Next renewal: " : "Membership ends: "}
                  </span>
                  {formatDate(sub.expiresAt)}
                </p>
                <p>
                  <span className="text-muted-foreground text-xs">
                    Auto-renew:{" "}
                  </span>
                  <span
                    className={`font-bold ${sub.autoRenew ? "text-green-600" : "text-muted-foreground"}`}
                  >
                    {sub.autoRenew ? "On" : "Off"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}