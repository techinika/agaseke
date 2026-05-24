import React from "react";
import {
  Edit,
  Users,
  Trophy,
  DollarSign,
  Package,
  Percent,
  Building,
  Copy,
  Gift,
} from "lucide-react";
import { Giveaway, GiveawayEntry } from "@/types/giveaway";

export default function GiveawayDetail({
  giveaway,
  entries,
  onEdit,
  onDelete,
  onPickWinners,
  onEnd,
  onActivate,
  onCopyLink,
  onShowWinners,
  creatorHandle,
}: {
  giveaway: Giveaway;
  entries: GiveawayEntry[];
  onEdit: () => void;
  onDelete: () => void;
  onPickWinners: () => void;
  onEnd: () => void;
  onActivate: () => void;
  onCopyLink: () => void;
  onShowWinners: () => void;
  creatorHandle: string;
}) {
  const isActive = giveaway.status === "active";
  const isEnded =
    giveaway.status === "ended" || giveaway.status === "completed";
  const hasWinners = giveaway.winners.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 sticky top-8">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-lg">{giveaway.title}</h3>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-slate-600"
        >
          <Edit size={18} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Participants
            </p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Winners
            </p>
            <p className="text-2xl font-bold">
              {giveaway.winners.length}/{giveaway.maxWinners}
            </p>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-[10px] font-bold text-orange-400 uppercase mb-2">
            Access
          </p>
          <p className="font-bold text-orange-800">
            {giveaway.access === "public"
              ? "Public"
              : giveaway.access === "supporters"
                ? "Supporters Only"
                : `Supporters (${giveaway.minSupportAmount}+ RWF)`}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Rewards
          </p>
          {giveaway.rewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-2 text-sm">
              {reward.type === "cash" && (
                <DollarSign size={14} className="text-green-600" />
              )}
              {reward.type === "merchandise" && (
                <Package size={14} className="text-blue-600" />
              )}
              {reward.type === "discount" && (
                <Percent size={14} className="text-orange-600" />
              )}
              {reward.type === "service" && (
                <Building size={14} className="text-amber-600" />
              )}
              <span>
                {reward.quantity}x {reward.title}
              </span>
            </div>
          ))}
        </div>

        {giveaway.partners.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Partners
            </p>
            <div className="flex flex-wrap gap-2">
              {giveaway.partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {partner.logo && (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span>{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={onCopyLink}
          className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
        >
          <Copy size={16} /> Share Link
        </button>

        {isEnded && hasWinners && (
          <button
            onClick={onShowWinners}
            className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition flex items-center justify-center gap-2"
          >
            <Trophy size={16} /> View Winners
          </button>
        )}

        {!isEnded && !isActive && (
          <button
            onClick={onActivate}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition"
          >
            Activate Giveaway
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={onPickWinners}
              disabled={entries.length === 0}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50"
            >
              Pick Winners
            </button>
            <button
              onClick={onEnd}
              className="w-full py-3 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition"
            >
              End Now
            </button>
          </>
        )}

        <button
          onClick={onDelete}
          className="w-full py-3 border border-red-100 text-red-500 rounded-lg font-bold text-sm hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
