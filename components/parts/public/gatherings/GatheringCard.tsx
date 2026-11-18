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
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { getPrice, parsePriceCurrency } from "@/lib/priceMap";

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; className: string }
> = {
  public: {
    icon: <Globe size={12} />,
    label: "Public",
    className: "bg-info-bg text-info",
  },
  supporters: {
    icon: <ShieldCheck size={12} />,
    label: "Supporters",
    className: "bg-brand-soft text-brand-strong",
  },
  supporters_tiered: {
    icon: <ShieldCheck size={12} />,
    label: "Tiered",
    className: "bg-warning-bg text-warning",
  },
  ticketed: {
    icon: <Ticket size={12} />,
    label: "Ticketed",
    className: "bg-success-bg text-success",
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
  const currency = parsePriceCurrency(gathering.currency);
  const ticketAmount = getPrice(gathering, (currency || undefined) as any);

  return (
    <div className="bg-surface rounded-control border border-line p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-brand-soft rounded-control flex items-center justify-center flex-shrink-0">
          <Calendar className="text-brand-strong" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/${creatorHandle}/gatherings/${gathering.id}`}
            className="block group"
          >
            <h3 className="text-xl font-bold text-fg mb-2 group-hover:text-brand-strong transition-colors">
              {gathering.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const et = gathering.eventType;
              const cfg =
                et && EVENT_TYPE_CONFIG[et]
                  ? EVENT_TYPE_CONFIG[et]
                  : ticketAmount > 0
                    ? EVENT_TYPE_CONFIG.ticketed
                    : null;
              if (cfg) {
                return (
                  <span
                    className={`inline-flex items-center gap-1 text-caption font-bold px-2 py-0.5 rounded-full ${cfg.className}`}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                );
              }
              return null;
            })()}
            {ticketAmount > 0 && (
              <span className="text-caption font-bold text-brand-strong bg-brand-soft px-2 py-0.5 rounded-full">
                {currency ? formatCurrency(ticketAmount, currency) : ticketAmount}
              </span>
            )}
          </div>
          {gathering.description && (
            <p className="text-muted-fg text-sm mb-4 line-clamp-2">
              {gathering.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-fg">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-muted-fg" />
              <span>{gathering.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-muted-fg" />
              <span>{gathering.time}</span>
            </div>
            {(isRsvped || userId === gathering.creatorId) && (
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-muted-fg" />
                <span>{gathering.location}</span>
              </div>
            )}
            {gathering.capacity && (
              <div className="flex items-center gap-1">
                <Users size={14} className="text-muted-fg" />
                <span>
                  {gathering.attendeesCount || 0}/{gathering.capacity}
                </span>
              </div>
            )}
          </div>
          {isRsvped &&
            !myRsvpStatus.checkedIn &&
            !myRsvpStatus.checkInDeclined && (
              <p className="text-xs text-brand-strong font-medium mt-2">
                Location visible after RSVP
              </p>
            )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRsvped && myRsvpStatus.checkedIn ? (
            <span className="text-sm font-bold text-success flex items-center gap-1">
              <Check size={16} /> You&apos;re checked in
            </span>
          ) : isRsvped && myRsvpStatus.checkInDeclined ? (
            <span className="text-sm font-bold text-danger flex items-center gap-1">
              <X size={16} /> Check-in declined
            </span>
          ) : isRsvped ? (
            <span className="text-sm font-bold text-success flex items-center gap-1">
              <Check size={16} /> You&apos;re attending
            </span>
          ) : isFull ? (
            <span className="text-sm font-bold text-muted-fg">
              Event is full
            </span>
          ) : (
            <span className="text-sm text-muted-fg">
              {gathering.capacity
                ? `${gathering.capacity - (gathering.attendeesCount || 0)} spots left`
                : gathering.eventType === "ticketed" || ticketAmount > 0
                  ? currency
                    ? `Buy ticket for ${formatCurrency(ticketAmount, currency)}`
                    : "Buy ticket"
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
            className="bg-brand-strong text-on-brand px-6 py-2 rounded-control font-bold text-sm hover:bg-brand-strong transition-all disabled:opacity-50 ml-3"
          >
            {rsvping ? (
              <Loader size={16} className="animate-spin" />
            ) : ticketAmount > 0 ? (
              "Buy Ticket"
            ) : (
              "RSVP Now"
            )}
          </button>
        )}
        {showTicket && (
          <button
            onClick={onViewTicket}
            className="flex items-center gap-1 px-3 py-2 border border-success text-success rounded-control text-sm font-bold hover:bg-success-bg transition"
          >
            <QrCode size={14} /> Ticket
          </button>
        )}
        <Link
          href={`/${creatorHandle}/gatherings/${gathering.id}`}
          className="flex items-center gap-1 text-sm font-medium text-brand-strong hover:text-brand-strong transition ml-auto"
        >
          Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
