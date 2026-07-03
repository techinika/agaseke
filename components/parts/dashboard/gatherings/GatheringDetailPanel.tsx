"use client";

import React from "react";
import {
  Calendar,
  Edit,
  Trash2,
  Wallet,
  Users,
  ArrowRight,
  User,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { EVENT_TYPE_LABELS_SHORT } from "./constants";

interface GatheringDetailPanelProps {
  activeEvent: any;
  attendees: any[];
  totalTicketRevenue: number;
  totalTicketCount: number;
  onEdit: (event: any) => void;
  onDelete: (eventId: string) => void;
  onToggleStatus: (eventId: string, currentStatus: string) => void;
  onOpenCheckIn: () => void;
}

export default function GatheringDetailPanel({
  activeEvent,
  attendees,
  totalTicketRevenue,
  totalTicketCount,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenCheckIn,
}: GatheringDetailPanelProps) {
  if (!activeEvent) {
    return (
      <div className="w-full md:w-96 bg-card p-8 overflow-y-auto h-full flex flex-col items-center justify-center text-muted-foreground">
        <Calendar size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold">Select an event to manage</p>
      </div>
    );
  }

  const selectedEventRevenue = attendees
    .filter((a) => a.paid)
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const platformSharePct = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;
  const creatorSharePct = Number(process.env.NEXT_PUBLIC_CREATOR_SHARE) || 0.9;
  const platformFee = selectedEventRevenue * platformSharePct;
  const creatorNet = selectedEventRevenue * creatorSharePct;

  return (
    <div className="w-full md:w-96 bg-card p-8 overflow-y-auto">
      <div className="animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-lg">Event Details</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(activeEvent)}
              className="p-2 text-muted-foreground hover:text-orange-500 transition"
              title="Edit Event"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete(activeEvent.id)}
              className="p-2 text-muted-foreground hover:text-red-500 transition"
              title="Delete Event"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-foreground p-6 rounded-lg text-background">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {EVENT_TYPE_LABELS_SHORT[activeEvent.eventType] || (activeEvent.ticketPrice > 0 ? "Ticketed" : "Public")}
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  activeEvent.status === "Upcoming"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              >
                {activeEvent.status === "Upcoming" ? "Active" : "Inactive"}
              </span>
            </div>
            <h2 className="text-xl font-bold">
              {activeEvent.eventType === "ticketed" || activeEvent.ticketPrice > 0
                ? `${(activeEvent.ticketPrice || 0).toLocaleString()} RWF Ticket`
                : activeEvent.eventType === "supporters_tiered" || activeEvent.minSupportTier > 0
                  ? `Min. Support: ${(activeEvent.minSupportTier || 0).toLocaleString()} RWF`
                  : activeEvent.eventType === "supporters"
                    ? "Supporters Only"
                    : "Open to Everyone"}
            </h2>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="text-green-400 font-bold">
                  {attendees.length}
                </span>{" "}
                <span className="text-muted-foreground">
                  {activeEvent.capacity
                    ? `/ ${activeEvent.capacity} spots`
                    : "registered"}
                </span>
              </div>
              <button
                onClick={() =>
                  onToggleStatus(
                    activeEvent.id,
                    activeEvent.status === "Upcoming" ? "Disabled" : "Upcoming",
                  )
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeEvent.status === "Upcoming"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {activeEvent.status === "Upcoming" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>

          {activeEvent.capacity && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex items-center gap-3">
              <Users size={20} className="text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Capacity Limit
                </p>
                <p className="text-xs text-amber-600">
                  {attendees.length} / {activeEvent.capacity} spots filled
                </p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
            {activeEvent.ticketPrice > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={18} className="text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-800">Ticket Sales</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Total collected</span>
                    <span className="font-bold text-emerald-800">
                      {totalTicketRevenue.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Platform fee ({(platformSharePct * 100).toFixed(0)}%)</span>
                    <span className="font-bold text-amber-600">
                      -{platformFee.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="border-t border-emerald-300 pt-2 flex justify-between">
                    <span className="font-bold text-emerald-800">You receive</span>
                    <span className="font-bold text-emerald-900">
                      {creatorNet.toLocaleString()} RWF
                    </span>
                  </div>
                </div>
                <Link
                  href="/creator/payouts"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                >
                  Withdraw earnings <ArrowRight size={12} />
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Wallet size={18} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No ticket set for this event</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm">
                RSVPs ({attendees.length})
              </h4>
            </div>
            {attendees.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                      {attendee.supporterName?.[0] || <User size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        {attendee.supporterName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {attendee.createdAt
                          ?.toDate?.()
                          .toLocaleDateString() || "Recently"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted rounded-lg">
                <Users size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No RSVPs yet</p>
              </div>
            )}
          </div>

          <button
            onClick={onOpenCheckIn}
            disabled={attendees.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground font-bold hover:border-orange-500 hover:text-orange-500 transition disabled:opacity-50"
          >
            <QrCode size={20} /> Check-in Guests
          </button>
        </div>
      </div>
    </div>
  );
}
