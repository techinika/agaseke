/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import { ArrowLeft, Plus } from "lucide-react";
import {
  checkInGatheringAttendee,
  declineGatheringAttendee,
  deleteCreatorGathering,
  subscribeToCreatorGatherings,
  subscribeToCreatorTicketSales,
  subscribeToGatheringAttendance,
  undoGatheringAttendeeCheckIn,
  updateCreatorGatheringStatus,
} from "@/features/gatherings/api";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { logActivity } from "@/lib/logger";
import Link from "next/link";
import GatheringListPanel from "@/components/parts/dashboard/gatherings/GatheringListPanel";
import GatheringDetailPanel from "@/components/parts/dashboard/gatherings/GatheringDetailPanel";
import CheckInModal from "@/components/parts/dashboard/gatherings/CheckInModal";

export default function GatheringsPage() {
  const { creator } = useAuth();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTicketRevenue, setTotalTicketRevenue] = useState(0);
  const [totalTicketCount, setTotalTicketCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  useEffect(() => {
    if (!creator?.uid) return;
    const unsubscribe = subscribeToCreatorGatherings(creator.uid, (items) => {
      setEvents(items as any[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [creator?.uid]);

  const upcomingEvents = events.filter((e) => e.status === "Upcoming");
  const displayEvents =
    activeTab === "upcoming"
      ? events.filter((e) => e.status === "Upcoming")
      : events.filter((e) => e.status !== "Upcoming");
  const activeEvent = displayEvents[selectedEventIndex];
  const currentEventId = activeEvent?.id;
  const displayAttendees = currentEventId ? attendees : [];

  useEffect(() => {
    if (!currentEventId) return;
    const unsubscribe = subscribeToGatheringAttendance(currentEventId, (items) => {
      setAttendees(items as any[]);
    });
    return () => unsubscribe();
  }, [currentEventId]);

  useEffect(() => {
    if (!creator?.handle) return;
    const unsubscribe = subscribeToCreatorTicketSales(
      creator.handle,
      ({ revenue, count }) => {
        setTotalTicketRevenue(revenue);
        setTotalTicketCount(count);
      },
    );
    return () => unsubscribe();
  }, [creator?.handle]);

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    try {
      await updateCreatorGatheringStatus(eventId, newStatus);
      toast.success(`Event ${newStatus === "Upcoming" ? "enabled" : "disabled"}`);
      console.log(
        `[GATHERING_DASHBOARD] Status updated: "${activeEvent?.title}" -> ${newStatus}`,
      );
      logActivity({
        level: "info",
        category: "gathering",
        message: `Gathering ${newStatus === "Upcoming" ? "enabled" : "disabled"}: "${activeEvent?.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: eventId, newStatus },
      });
    } catch (error) {
      console.error("[GATHERING_DASHBOARD] Status update error:", error);
      logActivity({
        level: "error",
        category: "gathering",
        message: "Gathering: Failed to update status",
        creatorId: creator?.uid,
        metadata: {
          gatheringId: eventId,
          errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(
            0,
            5000,
          ),
        },
      });
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) return;
    setDeleting(true);
    try {
      await deleteCreatorGathering(isDeleting);
      toast.success("Event deleted");
      logActivity({
        level: "warning",
        category: "gathering",
        message: `Gathering deleted: "${activeEvent?.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: isDeleting },
      });
      setIsDeleting(null);
      setSelectedEventIndex(0);
    } catch (error) {
      console.error("Delete error:", error);
      logActivity({
        level: "error",
        category: "gathering",
        message: "Gathering: Failed to delete event",
        creatorId: creator?.uid,
        metadata: {
          gatheringId: isDeleting,
          errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(
            0,
            5000,
          ),
        },
      });
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (event: any) => {
    window.location.href = `/creator/gatherings/${event.id}/edit`;
  };

  const handleCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendee.id
          ? { ...a, checkedIn: true, checkedInAt: new Date(), checkInDeclined: false }
          : a,
      ),
    );
    try {
      await checkInGatheringAttendee(attendee.id);

      sendCommsEmail("gathering_checkin", {
        supporterEmail: attendee.supporterEmail,
        supporterName: attendee.supporterName,
        creatorName: creator?.name,
        eventTitle: activeEvent.title,
        eventDate: activeEvent.date,
        eventTime: activeEvent.time,
        eventLocation: activeEvent.location,
      }).catch((err) => {
        console.error("Failed to send check-in email", err);
      });

      logActivity({
        level: "success",
        category: "gathering",
        message: `Gathering check-in: ${attendee.supporterName} checked into "${activeEvent.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`${attendee.supporterName} checked in!`);
    } catch (error) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? {
                ...a,
                checkedIn: attendee.checkedIn,
                checkedInAt: attendee.checkedInAt,
                checkInDeclined: attendee.checkInDeclined,
              }
            : a,
        ),
      );
      console.error("Check-in error:", error);
      logActivity({
        level: "error",
        category: "gathering",
        message: `Gathering: Failed to check in ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: {
          gatheringId: currentEventId,
          attendeeId: attendee.id,
          errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(
            0,
            5000,
          ),
        },
      });
      toast.error("Failed to check in guest");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleDeclineCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendee.id ? { ...a, checkedIn: false, checkInDeclined: true } : a,
      ),
    );
    try {
      await declineGatheringAttendee(attendee.id);

      sendCommsEmail("gathering_declined", {
        supporterEmail: attendee.supporterEmail,
        supporterName: attendee.supporterName,
        creatorName: creator?.name,
        eventTitle: activeEvent.title,
        eventDate: activeEvent.date,
      }).catch((err) => {
        console.error("Failed to send declined email", err);
      });

      logActivity({
        level: "warning",
        category: "gathering",
        message: `Gathering check-in declined: ${attendee.supporterName} for "${activeEvent.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`${attendee.supporterName} declined`);
    } catch (error) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? {
                ...a,
                checkedIn: attendee.checkedIn,
                checkInDeclined: attendee.checkInDeclined,
              }
            : a,
        ),
      );
      console.error("Decline error:", error);
      logActivity({
        level: "error",
        category: "gathering",
        message: `Gathering: Failed to decline check-in for ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: {
          gatheringId: currentEventId,
          attendeeId: attendee.id,
          errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(
            0,
            5000,
          ),
        },
      });
      toast.error("Failed to update");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUndoCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendee.id
          ? {
              ...a,
              checkedIn: false,
              checkInDeclined: false,
              checkedInAt: null,
              checkInDeclinedAt: null,
            }
          : a,
      ),
    );
    try {
      await undoGatheringAttendeeCheckIn(attendee.id);

      const previousStatus = attendee.checkedIn ? "check-in" : "decline";
      sendCommsEmail("gathering_undo", {
        supporterEmail: attendee.supporterEmail,
        supporterName: attendee.supporterName,
        creatorName: creator?.name,
        eventTitle: activeEvent?.title,
        eventDate: activeEvent?.date,
        action: `undo_${previousStatus}`,
      }).catch((err) => {
        console.error("Failed to send undo email", err);
      });

      logActivity({
        level: "info",
        category: "gathering",
        message: `Gathering check-in undone: ${attendee.supporterName} for "${activeEvent?.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`Undo for ${attendee.supporterName}`);
    } catch (error) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? {
                ...a,
                checkedIn: attendee.checkedIn,
                checkInDeclined: attendee.checkInDeclined,
                checkedInAt: attendee.checkedInAt,
                checkInDeclinedAt: attendee.checkInDeclinedAt,
              }
            : a,
        ),
      );
      console.error("Undo error:", error);
      logActivity({
        level: "error",
        category: "gathering",
        message: `Gathering: Failed to undo check-in for ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: {
          gatheringId: currentEventId,
          attendeeId: attendee.id,
          errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(
            0,
            5000,
          ),
        },
      });
      toast.error("Failed to undo");
    } finally {
      setCheckingIn(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <aside className="w-full bg-card border-b border-border hidden md:flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-xl font-bold uppercase">Gatherings</h2>
        </div>
        <div className="flex items-center gap-4">
          {totalTicketCount > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Total Ticket Sales
              </p>
              <p className="text-lg font-bold text-emerald-600">
                {totalTicketRevenue.toLocaleString()} RWF
              </p>
              <p className="text-[10px] text-muted-foreground">
                {totalTicketCount} ticket{totalTicketCount !== 1 ? "s" : ""} sold
              </p>
            </div>
          )}
          <Link
            href="/creator/gatherings/new"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
          >
            <Plus size={18} /> Plan Event
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col md:flex-row">
        <GatheringListPanel
          loading={loading}
          events={events}
          upcomingEvents={upcomingEvents}
          activeTab={activeTab}
          selectedEventIndex={selectedEventIndex}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedEventIndex(0);
          }}
          onSelectEvent={setSelectedEventIndex}
          onToggleStatus={handleUpdateStatus}
        />

        <GatheringDetailPanel
          activeEvent={activeEvent}
          attendees={displayAttendees}
          totalTicketRevenue={totalTicketRevenue}
          totalTicketCount={totalTicketCount}
          onEdit={startEdit}
          onDelete={setIsDeleting}
          onToggleStatus={handleUpdateStatus}
          onOpenCheckIn={() => setShowCheckIn(true)}
        />
      </main>

      <ConfirmModal
        isOpen={isDeleting !== null}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Gathering?"
        message="This will permanently delete this event and remove all RSVPs. This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />

      <CheckInModal
        isOpen={showCheckIn}
        activeEvent={activeEvent}
        attendees={displayAttendees}
        checkingIn={checkingIn}
        searchQuery={searchQuery}
        onClose={() => {
          setShowCheckIn(false);
          setSearchQuery("");
        }}
        onSearchChange={setSearchQuery}
        onCheckIn={handleCheckIn}
        onDeclineCheckIn={handleDeclineCheckIn}
        onUndoCheckIn={handleUndoCheckIn}
      />
    </div>
  );
}
