"use client";

import React from "react";
import { Calendar, MapPin, Loader, ChevronRight, Ticket } from "lucide-react";
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS_SHORT } from "./constants";

interface GatheringListPanelProps {
  loading: boolean;
  events: any[];
  upcomingEvents: any[];
  activeTab: "upcoming" | "past";
  selectedEventIndex: number;
  onTabChange: (tab: "upcoming" | "past") => void;
  onSelectEvent: (index: number) => void;
  onToggleStatus: (eventId: string, currentStatus: string) => void;
}

export default function GatheringListPanel({
  loading,
  events,
  upcomingEvents,
  activeTab,
  selectedEventIndex,
  onTabChange,
  onSelectEvent,
  onToggleStatus,
}: GatheringListPanelProps) {
  const displayEvents = activeTab === "upcoming"
    ? events.filter((e) => e.status === "Upcoming")
    : events.filter((e) => e.status !== "Upcoming");

  return (
    <div className="flex-1 p-8 border-r border-border overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => onTabChange("upcoming")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === "upcoming"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => onTabChange("past")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === "past"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            Past
          </button>
        </div>
        <span className="text-xs font-bold text-orange-600">
          {upcomingEvents.length} Active
        </span>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Loader className="animate-spin mx-auto text-muted-foreground" />
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Calendar className="mx-auto text-muted-foreground mb-4" size={40} />
            <p className="text-muted-foreground font-medium">No events yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first event to get started
            </p>
          </div>
        ) : (
          displayEvents.map((event, index) => (
            <div
              key={event.id}
              onClick={() => onSelectEvent(index)}
              className={`w-full text-left p-6 rounded-lg border transition-all cursor-pointer ${
                selectedEventIndex === index
                  ? "bg-card border-orange-500 shadow-xl scale-[1.01]"
                  : "bg-card border-border hover:border-border-strong"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-3 rounded-lg ${event.eventType === "supporters_tiered" || event.minSupportTier > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-foreground"}`}>
                    {EVENT_TYPE_ICONS[event.eventType] || (event.ticketPrice > 0 ? <Ticket size={20} /> : <Calendar size={20} />)}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded">
                    {EVENT_TYPE_LABELS_SHORT[event.eventType] || (event.ticketPrice > 0 ? "Ticketed" : "Public")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(
                        event.id,
                        event.status === "Upcoming" ? "Disabled" : "Upcoming",
                      );
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase transition ${
                      event.status === "Upcoming"
                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                        : "bg-border-strong text-muted-foreground hover:bg-muted"
                    }`}
                    title={event.status === "Upcoming" ? "Click to disable" : "Click to enable"}
                  >
                    {event.status}
                  </button>
                </div>
              </div>
              <h4 className="text-xl font-bold mb-1">{event.title}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-muted-foreground" /> {event.location}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-xs font-bold text-muted-foreground">
                  {event.attendeesCount || 0} RSVPs
                </div>
                <ChevronRight
                  size={16}
                  className={
                    selectedEventIndex === index
                      ? "text-orange-500"
                      : "text-muted-foreground"
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
