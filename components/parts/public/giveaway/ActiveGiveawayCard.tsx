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
import { Timestamp } from "firebase/firestore";
import { Giveaway } from "./types";

export function ActiveGiveawayCard({
  giveaway,
  accessible,
  hasParticipated,
  daysLeft,
  onParticipate,
  onShare,
  creatorHandle,
}: {
  giveaway: Giveaway;
  accessible: boolean;
  hasParticipated: boolean;
  daysLeft: number;
  onParticipate: () => void;
  onShare: () => void;
  creatorHandle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-card/20 px-3 py-1 rounded-full text-xs font-bold">
              {giveaway.type === "random" ? "Lucky Draw" : "Challenge"}
            </span>
            <span className="bg-green-500/80 px-2 py-1 rounded-full text-xs font-bold">
              Active
            </span>
          </div>
          <button
            onClick={onShare}
            className="p-2 bg-card/20 rounded-full hover:bg-card/30 transition"
          >
            <Share2 size={18} />
          </button>
        </div>
        <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
        <p className="text-white/80 text-sm">{giveaway.description}</p>

        {giveaway.partners.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-xs text-white/60">Sponsored by:</span>
            {giveaway.partners.map((partner: any) => (
              <div
                key={partner.id}
                className="flex items-center gap-1.5 bg-card/20 px-2 py-1 rounded-full"
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
          <div className="text-center p-3 bg-muted rounded-xl">
            <Clock size={20} className="mx-auto text-orange-600 mb-1" />
            <p className="text-xs text-muted-foreground">Time Left</p>
            <p className="font-bold">{daysLeft} days</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-xl">
            <Users size={20} className="mx-auto text-orange-600 mb-1" />
            <p className="text-xs text-muted-foreground">Winners</p>
            <p className="font-bold">{giveaway.maxWinners}</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-xl">
            <Trophy size={20} className="mx-auto text-orange-600 mb-1" />
            <p className="text-xs text-muted-foreground">Prizes</p>
            <p className="font-bold">{giveaway.rewards.length}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase">Prizes</p>
          {giveaway.rewards.map((reward: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-muted rounded-xl"
            >
              <div
                className={`p-2 rounded-lg ${
                  reward.type === "cash"
                    ? "bg-green-100 text-green-600"
                    : reward.type === "merchandise"
                      ? "bg-blue-100 text-blue-600"
                      : reward.type === "discount"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-amber-100 text-amber-600"
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
                <p className="text-xs text-muted-foreground">
                  Quantity: {reward.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href={`/${creatorHandle}/giveaways/${giveaway.id}`}
          className="flex items-center justify-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition mb-4"
        >
          View Details <ArrowRight size={14} />
        </Link>

        {!accessible ? (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
            <Lock size={20} className="text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">Restricted Access</p>
              <p className="text-xs text-amber-700 mt-1">
                {giveaway.access === "supporters"
                  ? "This giveaway is only for supporters."
                  : `You need to support with at least ${giveaway.minSupportAmount?.toLocaleString()} RWF to participate.`}
              </p>
            </div>
          </div>
        ) : hasParticipated ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-full">
              <Check size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800">You are Entered!</p>
              <p className="text-xs text-green-700 mt-1">
                Good luck! Winners will be announced soon.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={onParticipate}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg"
          >
            Enter Giveaway
          </button>
        )}
      </div>
    </div>
  );
}
