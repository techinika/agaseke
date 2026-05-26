import { Calendar, MapPin, Users, Check, X } from "lucide-react";
import { Gathering } from "./types";

export function PastGatheringCard({
  gathering,
  wasAttending,
  myRsvpStatus,
}: {
  gathering: Gathering;
  wasAttending: boolean;
  myRsvpStatus?: { checkedIn: boolean; checkInDeclined: boolean };
}) {
  return (
    <div className="bg-muted rounded-xl border border-border p-6 opacity-70">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar className="text-muted-foreground" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-2">
            {gathering.title}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-muted-foreground" />
              <span>{gathering.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} className="text-muted-foreground" />
              <span>{gathering.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} className="text-slate-400" />
              <span>{gathering.attendeesCount || 0} attended</span>
            </div>
          </div>
        </div>
      </div>

      {wasAttending && (
        <div className="mt-4 pt-4 border-t border-border">
          {myRsvpStatus?.checkedIn ? (
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <Check size={16} /> You were checked in
            </span>
          ) : myRsvpStatus?.checkInDeclined ? (
            <span className="text-sm font-bold text-red-500 flex items-center gap-1">
              <X size={16} /> Check-in was declined
            </span>
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              You RSVP&apos;d but didn&apos;t attend
            </span>
          )}
        </div>
      )}
    </div>
  );
}
