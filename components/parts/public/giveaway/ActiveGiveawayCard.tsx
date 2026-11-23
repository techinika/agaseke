/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Clock,
  Users,
  Trophy,
  DollarSign,
  Package,
  Percent,
  Gift,
  Share2,
  Lock,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Giveaway } from "./types";
import { formatMoney as formatCurrency } from "@/lib/format/money";

export function ActiveGiveawayCard({
  giveaway,
  accessible,
  hasParticipated,
  daysLeft,
  onParticipate,
  onShare,
  onSupport,
  isLoggedIn = true,
  creatorHandle,
  currency,
}: {
  giveaway: Giveaway;
  accessible: boolean;
  hasParticipated: boolean;
  daysLeft: number;
  onParticipate: () => void;
  onShare: () => void;
  onSupport?: () => void;
  isLoggedIn?: boolean;
  creatorHandle?: string;
  currency?: string;
}) {
  return (
    <div className="bg-surface border border-line rounded-card overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-brand-strong to-warning p-6 text-on-brand">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-surface/20 px-3 py-1 rounded-full text-xs font-bold">
              {giveaway.type === "random" ? "Lucky Draw" : "Challenge"}
            </span>
            <span className="bg-success/80 px-2 py-1 rounded-full text-xs font-bold">
              Active
            </span>
          </div>
          <button
            onClick={onShare}
            className="p-2 bg-surface/20 rounded-full hover:bg-surface/30 transition"
          >
            <Share2 size={18} />
          </button>
        </div>
        <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
        <p className="text-on-brand/80 text-sm">{giveaway.description}</p>

        {giveaway.partners.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-xs text-on-brand/60">Sponsored by:</span>
            {giveaway.partners.map((partner: any) => (
              <div
                key={partner.id}
                className="flex items-center gap-1.5 bg-surface/20 px-2 py-1 rounded-full"
              >
                {partner.logo && (
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                )}
                <span className="text-xs font-medium">{partner.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-surface-sunken rounded-control">
            <Clock size={20} className="mx-auto text-brand-strong mb-1" />
            <p className="text-xs text-muted-fg">Time Left</p>
            <p className="font-bold">{daysLeft} days</p>
          </div>
          <div className="text-center p-3 bg-surface-sunken rounded-control">
            <Users size={20} className="mx-auto text-brand-strong mb-1" />
            <p className="text-xs text-muted-fg">Winners</p>
            <p className="font-bold">{giveaway.maxWinners}</p>
          </div>
          <div className="text-center p-3 bg-surface-sunken rounded-control">
            <Trophy size={20} className="mx-auto text-brand-strong mb-1" />
            <p className="text-xs text-muted-fg">Prizes</p>
            <p className="font-bold">{giveaway.rewards.length}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs font-bold text-muted-fg uppercase">Prizes</p>
          {giveaway.rewards.map((reward: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-surface-sunken rounded-control"
            >
              <div
                className={`p-2 rounded-control ${
                  reward.type === "cash"
                    ? "bg-success-bg text-success"
                    : reward.type === "merchandise"
                      ? "bg-info-bg text-info"
                      : reward.type === "discount"
                        ? "bg-brand-soft text-brand-strong"
                        : "bg-warning-bg text-warning"
                }`}
              >
                {reward.type === "cash" && <DollarSign size={18} />}
                {reward.type === "merchandise" && <Package size={18} />}
                {reward.type === "discount" && <Percent size={18} />}
                {(reward.type === "service" || reward.type === "other") && (
                  <Gift size={18} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{reward.title}</p>
                <p className="text-xs text-muted-fg">
                  Quantity: {reward.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href={`/${creatorHandle}/giveaways/${giveaway.id}`}
          className="flex items-center justify-center gap-1 text-sm font-medium text-brand-strong hover:text-brand-strong transition mb-4"
        >
          View Details <ArrowRight size={14} />
        </Link>

        {!accessible ? (
          <div className="bg-warning-bg border border-warning-bg rounded-control p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lock size={20} className="text-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-warning">Restricted Access</p>
                <p className="text-xs text-warning mt-1">
                  {giveaway.access === "supporters"
                    ? "This giveaway is only for supporters."
                    : `You need to support with at least ${
                        currency
                          ? formatCurrency(giveaway.minSupportAmount || 0, currency)
                          : (giveaway.minSupportAmount || 0).toLocaleString()
                      } to participate.`}
                </p>
              </div>
            </div>
            {onSupport && (
              <button
                type="button"
                onClick={onSupport}
                className="min-h-11 shrink-0 rounded-control bg-brand-strong px-4 py-2 text-xs font-bold text-on-brand transition hover:opacity-90"
              >
                Support
              </button>
            )}
          </div>
        ) : hasParticipated ? (
          <div className="bg-success-bg border border-success-bg rounded-control p-4 flex items-center gap-3">
            <div className="p-2 bg-success rounded-full">
              <Check size={18} className="text-on-brand" />
            </div>
            <div>
              <p className="font-bold text-success">You are Entered!</p>
              <p className="text-xs text-success mt-1">
                Good luck! Winners will be announced soon.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onParticipate}
            className="min-h-12 w-full py-4 bg-gradient-to-r from-brand-strong to-warning text-on-brand rounded-control font-bold hover:opacity-90 transition shadow-lg"
          >
            {isLoggedIn ? "Enter Giveaway" : "Log in to Enter"}
          </button>
        )}
      </div>
    </div>
  );
}
