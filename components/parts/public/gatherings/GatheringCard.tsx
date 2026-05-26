import { Calendar, MapPin, Clock, Users, Check, Loader, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Gathering } from "./types";

export function GatheringCard({
  gathering,
  isRsvped,
  isFull,
  rsvping,
  myRsvpStatus,
  onRSVP,
  userId,
  creatorHandle,
}: {
  gathering: Gathering;
  isRsvped: boolean;
  isFull: boolean;
  rsvping: boolean;
  myRsvpStatus: { checkedIn: boolean; checkInDeclined: boolean };
  onRSVP: () => void;
  userId?: string;
  creatorHandle?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar className="text-orange-500" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/${creatorHandle}/gatherings/${gathering.id}`} className="block group">
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-orange-600 transition-colors">
              {gathering.title}
            </h3>
          </Link>
          {gathering.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {gathering.description}
            </p>
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
                Location will be shared after check-in
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
                : "Open to all supporters"}
            </span>
          )}
        </div>

        {!isRsvped && !isFull && (
          <button
            onClick={onRSVP}
            disabled={rsvping}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            {rsvping ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              "RSVP Now"
            )}
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
