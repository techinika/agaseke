import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Check,
  Loader,
  X,
  ArrowRight,
  QrCode,
  Globe,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { Gathering, type EventType } from "./types";

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; className: string }
> = {
  public: {
    icon: <Globe size={12} />,
    label: "Public",
    className: "bg-blue-50 text-blue-600",
  },
  supporters: {
    icon: <ShieldCheck size={12} />,
    label: "Supporters",
    className: "bg-purple-50 text-purple-600",
  },
  supporters_tiered: {
    icon: <ShieldCheck size={12} />,
    label: "Tiered",
    className: "bg-amber-50 text-amber-600",
  },
  ticketed: {
    icon: <Ticket size={12} />,
    label: "Ticketed",
    className: "bg-green-50 text-green-600",
  },
};

export function GatheringCard({
  gathering,
  isRsvped,
  isFull,
  rsvping,
  myRsvpStatus,
  onRSVP,
  userId,
  creatorHandle,
  showTicket,
  onViewTicket,
}: {
  gathering: Gathering;
  isRsvped: boolean;
  isFull: boolean;
  rsvping: boolean;
  myRsvpStatus: { checkedIn: boolean; checkInDeclined: boolean };
  onRSVP: () => void;
  userId?: string;
  creatorHandle?: string;
  showTicket?: boolean;
  onViewTicket?: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar className="text-orange-500" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/${creatorHandle}/gatherings/${gathering.id}`}
            className="block group"
          >
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-orange-600 transition-colors">
              {gathering.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const et = gathering.eventType;
              const cfg =
                et && EVENT_TYPE_CONFIG[et]
                  ? EVENT_TYPE_CONFIG[et]
                  : (gathering.ticketPrice ?? 0) > 0
                    ? EVENT_TYPE_CONFIG.ticketed
                    : null;
              if (cfg) {
                return (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.className}`}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                );
              }
              return null;
            })()}
            {(gathering.ticketPrice ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {(gathering.ticketPrice ?? 0).toLocaleString()} RWF
              </span>
            )}
          </div>
          {gathering.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: gathering.description }} />
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-muted-foreground" />
              <span>{gathering.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-muted-foreground" />
              <span>{gathering.time}</span>
            </div>
            {(isRsvped || userId === gathering.creatorId) && (
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-muted-foreground" />
                <span>{gathering.location}</span>
              </div>
            )}
            {gathering.capacity && (
              <div className="flex items-center gap-1">
                <Users size={14} className="text-muted-foreground" />
                <span>
                  {gathering.attendeesCount || 0}/{gathering.capacity}
                </span>
              </div>
            )}
          </div>
          {isRsvped &&
            !myRsvpStatus.checkedIn &&
            !myRsvpStatus.checkInDeclined && (
              <p className="text-xs text-orange-600 font-medium mt-2">
                Location visible after RSVP
              </p>
            )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRsvped && myRsvpStatus.checkedIn ? (
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <Check size={16} /> You&apos;re checked in
            </span>
          ) : isRsvped && myRsvpStatus.checkInDeclined ? (
            <span className="text-sm font-bold text-red-500 flex items-center gap-1">
              <X size={16} /> Check-in declined
            </span>
          ) : isRsvped ? (
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <Check size={16} /> You&apos;re attending
            </span>
          ) : isFull ? (
            <span className="text-sm font-bold text-muted-foreground">
              Event is full
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {gathering.capacity
                ? `${gathering.capacity - (gathering.attendeesCount || 0)} spots left`
                : gathering.eventType === "ticketed" ||
                    (gathering.ticketPrice ?? 0) > 0
                  ? `Buy ticket for ${(gathering.ticketPrice ?? 0).toLocaleString()} RWF`
                  : gathering.eventType === "supporters" ||
                      gathering.eventType === "supporters_tiered" ||
                      (gathering.minSupportTier ?? 0) > 0
                    ? "Open to supporters"
                    : "Open to everyone"}
            </span>
          )}
        </div>
        {!isRsvped && !isFull && (
          <button
            onClick={onRSVP}
            disabled={rsvping}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50 ml-3"
          >
            {rsvping ? (
              <Loader size={16} className="animate-spin" />
            ) : (gathering.ticketPrice ?? 0) > 0 ? (
              "Buy Ticket"
            ) : (
              "RSVP Now"
            )}
          </button>
        )}
        {showTicket && (
          <button
            onClick={onViewTicket}
            className="flex items-center gap-1 px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-50 transition"
          >
            <QrCode size={14} /> Ticket
          </button>
        )}
        <Link
          href={`/${creatorHandle}/gatherings/${gathering.id}`}
          className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition ml-auto"
        >
          Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
