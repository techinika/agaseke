/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  MapPin,
  Plus,
  ArrowLeft,
  ChevronRight,
  QrCode,
  Loader,
  X,
  ShieldCheck,
  Trash2,
  Users,
  User,
  Search,
  Check,
  Send,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Edit } from "lucide-react";
import { logActivity } from "@/lib/logger";

export default function GatheringsPage() {
  const { creator } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const creatingRef = useRef(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    minSupportTier: 0,
    ticketPrice: 0,
    capacity: 20,
    creatorId: creator?.uid,
    active: true,
  });
  useEffect(() => {
    if (!creator?.uid) return;

    const q = query(
      collection(db, "creatorGatherings"),
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gatheringData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(gatheringData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [creator?.uid]);

  const upcomingEvents = events.filter((e) => e.status === "Upcoming");
  const pastEvents = events.filter((e) => e.status !== "Upcoming");
  const displayEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;
  const activeEvent = displayEvents[selectedEventIndex];
  const currentEventId = activeEvent?.id;

  useEffect(() => {
    if (!currentEventId) {
      setAttendees([]);
      return;
    }

    const attendanceRef = collection(db, "gatheringsAttendance");
    const q = query(
      attendanceRef,
      where("gatheringId", "==", currentEventId),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendeeData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendees(attendeeData);
    });

    return () => unsubscribe();
  }, [currentEventId]);

  const handleCreate = async () => {
    if (!creator || !formData.title || creatingRef.current) return;
    creatingRef.current = true;

    setIsSimulating(true);
    try {
      if (editingEvent) {
        await updateDoc(doc(db, "creatorGatherings", editingEvent.id), {
          ...formData,
          status: formData.active ? "Upcoming" : "Disabled",
        });
        toast.success("Event updated!");
        logActivity({
          level: "info",
          category: "support",
          message: `Gathering updated: "${formData.title}"`,
          creatorId: creator.uid,
          metadata: { gatheringId: editingEvent.id },
        });
        setEditingEvent(null);
      } else {
        const docRef = await addDoc(collection(db, "creatorGatherings"), {
          ...formData,
          creatorId: creator?.uid,
          attendeesCount: 0,
          status: formData.active ? "Upcoming" : "Disabled",
          createdAt: serverTimestamp(),
        });
        toast.success("Event created!");
        logActivity({
          level: "info",
          category: "support",
          message: `Gathering created: "${formData.title}"`,
          creatorId: creator.uid,
          metadata: { gatheringId: docRef.id },
        });
        fetch("/api/comms/email/gathering/created", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId: creator.uid,
            creatorName: creator.name,
            creatorHandle: creator.handle,
            gatheringId: docRef.id,
            gatheringTitle: formData.title,
            gatheringDate: formData.date,
            gatheringTime: formData.time,
            gatheringLocation: formData.location,
            gatheringDescription: formData.description,
          }),
        }).catch(() => {});
      }
      setIsCreating(false);
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        minSupportTier: 0,
        ticketPrice: 0,
        capacity: 20,
        creatorId: creator?.uid,
        active: true,
      });
    } catch (e) {
      console.error(e);
      logActivity({
        level: "error",
        category: "support",
        message: `Gathering: Failed to ${editingEvent ? "update" : "create"} event`,
        creatorId: creator?.uid,
        metadata: { errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
      });
      toast.error("Failed to save event");
    } finally {
      setIsSimulating(false);
      creatingRef.current = false;
    }
  };

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "creatorGatherings", eventId), {
        status: newStatus,
      });
      toast.success(
        `Event ${newStatus === "Upcoming" ? "enabled" : "disabled"}`,
      );
      logActivity({
        level: "info",
        category: "support",
        message: `Gathering ${newStatus === "Upcoming" ? "enabled" : "disabled"}: "${activeEvent?.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: eventId, newStatus },
      });
    } catch (error) {
      console.error("Status update error:", error);
      logActivity({
        level: "error",
        category: "support",
        message: "Gathering: Failed to update status",
        creatorId: creator?.uid,
        metadata: { gatheringId: eventId, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "creatorGatherings", isDeleting));
      toast.success("Event deleted");
      logActivity({
        level: "warning",
        category: "support",
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
        category: "support",
        message: "Gathering: Failed to delete event",
        creatorId: creator?.uid,
        metadata: { gatheringId: isDeleting, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      description: event.description || "",
      date: event.date || "",
      time: event.time || "",
      location: event.location || "",
      minSupportTier: event.minSupportTier || 0,
      ticketPrice: event.ticketPrice || 0,
      capacity: event.capacity || 0,
      creatorId: event.creatorId || creator?.uid,
      active: event.status === "Upcoming",
    });
    setIsCreating(true);
  };

  const handleCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: true, checkedInAt: new Date(), checkInDeclined: false } : a));
    try {
      await updateDoc(doc(db, "gatheringsAttendance", attendee.id), {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
      });

      fetch("/api/comms/email/gathering/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterEmail: attendee.supporterEmail,
          supporterName: attendee.supporterName,
          creatorName: creator?.name,
          eventTitle: activeEvent.title,
          eventDate: activeEvent.date,
          eventTime: activeEvent.time,
          eventLocation: activeEvent.location,
        }),
      }).catch(() => {});

      logActivity({
        level: "success",
        category: "support",
        message: `Gathering check-in: ${attendee.supporterName} checked into "${activeEvent.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`${attendee.supporterName} checked in!`);
    } catch (error) {
      setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: attendee.checkedIn, checkedInAt: attendee.checkedInAt, checkInDeclined: attendee.checkInDeclined } : a));
      console.error("Check-in error:", error);
      logActivity({
        level: "error",
        category: "support",
        message: `Gathering: Failed to check in ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to check in guest");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleDeclineCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: false, checkInDeclined: true } : a));
    try {
      await updateDoc(doc(db, "gatheringsAttendance", attendee.id), {
        checkedIn: false,
        checkInDeclined: true,
        checkInDeclinedAt: serverTimestamp(),
        checkInNote: "",
      });

      fetch("/api/comms/email/gathering/declined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterEmail: attendee.supporterEmail,
          supporterName: attendee.supporterName,
          creatorName: creator?.name,
          eventTitle: activeEvent.title,
          eventDate: activeEvent.date,
        }),
      }).catch(() => {});

      logActivity({
        level: "warning",
        category: "support",
        message: `Gathering check-in declined: ${attendee.supporterName} for "${activeEvent.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`${attendee.supporterName} declined`);
    } catch (error) {
      setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: attendee.checkedIn, checkInDeclined: attendee.checkInDeclined } : a));
      console.error("Decline error:", error);
      logActivity({
        level: "error",
        category: "support",
        message: `Gathering: Failed to decline check-in for ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to update");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUndoCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
    setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: false, checkInDeclined: false, checkedInAt: null, checkInDeclinedAt: null } : a));
    try {
      await updateDoc(doc(db, "gatheringsAttendance", attendee.id), {
        checkedIn: false,
        checkInDeclined: false,
        checkedInAt: null,
        checkInDeclinedAt: null,
      });

      const previousStatus = attendee.checkedIn ? "check-in" : "decline";
      fetch("/api/comms/email/gathering/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterEmail: attendee.supporterEmail,
          supporterName: attendee.supporterName,
          creatorName: creator?.name,
          eventTitle: activeEvent?.title,
          eventDate: activeEvent?.date,
          action: `undo_${previousStatus}`,
        }),
      }).catch(() => {});

      logActivity({
        level: "info",
        category: "support",
        message: `Gathering check-in undone: ${attendee.supporterName} for "${activeEvent?.title}"`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id },
      });

      toast.success(`Undo for ${attendee.supporterName}`);
    } catch (error) {
      setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, checkedIn: attendee.checkedIn, checkInDeclined: attendee.checkInDeclined, checkedInAt: attendee.checkedInAt, checkInDeclinedAt: attendee.checkInDeclinedAt } : a));
      console.error("Undo error:", error);
      logActivity({
        level: "error",
        category: "support",
        message: `Gathering: Failed to undo check-in for ${attendee.supporterName}`,
        creatorId: creator?.uid,
        metadata: { gatheringId: currentEventId, attendeeId: attendee.id, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to undo");
    } finally {
      setCheckingIn(null);
    }
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.supporterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.supporterEmail?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const declinedCount = attendees.filter((a) => a.checkInDeclined).length;

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
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
        >
          <Plus size={18} /> Plan Event
        </button>
      </aside>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 p-8 border-r border-border overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab("upcoming");
                  setSelectedEventIndex(0);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                  activeTab === "upcoming"
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => {
                  setActiveTab("past");
                  setSelectedEventIndex(0);
                }}
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
                  onClick={() => setSelectedEventIndex(index)}
                  className={`w-full text-left p-6 rounded-lg border transition-all cursor-pointer ${
                    selectedEventIndex === index
                      ? "bg-card border-orange-500 shadow-xl scale-[1.01]"
                      : "bg-card border-border hover:border-border-strong"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`p-3 rounded-lg ${event.minSupportTier > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-foreground"}`}
                    >
                      {event.minSupportTier > 0 ? (
                        <ShieldCheck size={20} />
                      ) : (
                        <Calendar size={20} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(
                            event.id,
                            event.status === "Upcoming"
                              ? "Disabled"
                              : "Upcoming",
                          );
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase transition ${
                          event.status === "Upcoming"
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-border-strong text-muted-foreground hover:bg-muted"
                        }`}
                        title={
                          event.status === "Upcoming"
                            ? "Click to disable"
                            : "Click to enable"
                        }
                      >
                        {event.status}
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold mb-1">{event.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-muted-foreground" />{" "}
                    {event.location}
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

        <div className="w-full md:w-96 bg-card p-8 overflow-y-auto">
          {activeEvent ? (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-lg">Event Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(activeEvent)}
                    className="p-2 text-muted-foreground hover:text-orange-500 transition"
                    title="Edit Event"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setIsDeleting(activeEvent.id)}
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
                      Entry Requirement
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        activeEvent.status === "Upcoming"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {activeEvent.status === "Upcoming"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">
                    {activeEvent.minSupportTier > 0
                      ? `Min. Support: ${activeEvent.minSupportTier} RWF`
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
                        handleUpdateStatus(
                          activeEvent.id,
                          activeEvent.status === "Upcoming"
                            ? "Disabled"
                            : "Upcoming",
                        )
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        activeEvent.status === "Upcoming"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {activeEvent.status === "Upcoming"
                        ? "Deactivate"
                        : "Activate"}
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
                      <Users
                        size={24}
                        className="mx-auto text-muted-foreground mb-2"
                      />
                      <p className="text-sm text-muted-foreground">No RSVPs yet</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowCheckIn(true)}
                  disabled={attendees.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground font-bold hover:border-orange-500 hover:text-orange-500 transition disabled:opacity-50"
                >
                  <QrCode size={20} /> Check-in Guests
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">Select an event to manage</p>
            </div>
          )}
        </div>

        {/* --- Create Event Modal --- */}
        {isCreating && (
          <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-card w-full max-w-lg rounded-lg p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold uppercase tracking-tighter">
                  {editingEvent ? "Edit Event" : "Plan Gathering"}
                </h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingEvent(null);
                    setFormData({
                      title: "",
                      description: "",
                      date: "",
                      time: "",
                      location: "",
                      creatorId: creator?.uid,
                      minSupportTier: 0,
                      ticketPrice: 0,
                      capacity: 20,
                      active: true,
                    });
                  }}
                  className="p-2 hover:bg-muted rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="Gathering Title"
                  value={formData.title}
                  className="w-full text-xl font-bold outline-none border-b-2 border-border pb-2 focus:border-orange-500 transition placeholder:text-muted-foreground"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  rows={3}
                  className="w-full text-sm outline-none border-b border-border pb-2 focus:border-orange-500 transition placeholder:text-muted-foreground resize-none"
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Location (Physical or Digital link)"
                  value={formData.location}
                  className="w-full text-sm font-bold outline-none border-b border-border pb-2 focus:border-orange-500 transition"
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={formData.date}
                    className="bg-muted p-4 rounded-lg text-sm outline-none font-bold"
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                  <input
                    type="time"
                    value={formData.time}
                    className="bg-muted p-4 rounded-lg text-sm outline-none font-bold"
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                    Entry Threshold (Support Amount)
                  </label>
                  <input
                    type="number"
                    placeholder="Min. RWF support to qualify (0 for all)"
                    value={formData.minSupportTier || ""}
                    className="w-full bg-muted p-4 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minSupportTier: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    If set, only supporters who have contributed this amount or
                    more can see this.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                    Ticket Price (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="0 = Free (set price in RWF for paid gatherings)"
                    value={formData.ticketPrice || ""}
                    className="w-full bg-muted p-4 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ticketPrice: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Non-supporters can pay to attend. Free gatherings are open to all.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                    Event Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Max attendees (leave empty for unlimited)"
                    value={formData.capacity || ""}
                    className="w-full bg-muted p-4 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Set a limit on how many supporters can RSVP.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-bold text-sm">Publish Event</p>
                    <p className="text-xs text-muted-foreground">
                      Make visible to supporters
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, active: !formData.active })
                    }
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.active ? "bg-green-500" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-card rounded-full shadow transition-transform ${
                        formData.active ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!formData.title || isSimulating}
                  className="w-full bg-foreground text-background py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulating ? (
                    <Loader className="animate-spin" />
                  ) : editingEvent ? (
                    "Update Event"
                  ) : (
                    "Publish Gathering"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Delete Confirmation Modal --- */}
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

        {/* --- Check-in Modal --- */}
        {showCheckIn && activeEvent && (
          <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
            <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Check-in Guests</h2>
                  <p className="text-sm text-muted-foreground">
                    {checkedInCount}/{attendees.length} checked in
                    {declinedCount > 0 && (
                      <span className="text-red-500">
                        {" "}
                        · {declinedCount} declined
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCheckIn(false);
                    setSearchQuery("");
                  }}
                  className="p-2 hover:bg-muted rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                {filteredAttendees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={40} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">
                      {searchQuery ? "No matching attendees" : "No RSVPs yet"}
                    </p>
                  </div>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        attendee.checkedIn
                          ? "bg-green-50 border-green-200"
                          : "bg-card border-border hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold overflow-hidden">
                          {attendee.supporterPhoto ? (
                            <img
                              src={attendee.supporterPhoto}
                              alt={attendee.supporterName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            attendee.supporterName?.[0] || <User size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold">{attendee.supporterName}</p>
                          <p className="text-xs text-muted-foreground">
                            {attendee.supporterEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.checkedIn ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                              <Check size={16} /> Checked In
                            </span>
                            <button
                              onClick={() => handleUndoCheckIn(attendee)}
                              disabled={checkingIn === attendee.id}
                              className="text-xs text-muted-foreground hover:text-muted-foreground underline"
                            >
                              Undo
                            </button>
                          </div>
                        ) : attendee.checkInDeclined ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-red-500 text-sm font-bold">
                              <X size={16} /> Declined
                            </span>
                            <button
                              onClick={() => handleUndoCheckIn(attendee)}
                              disabled={checkingIn === attendee.id}
                              className="text-xs text-muted-foreground hover:text-muted-foreground underline"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCheckIn(attendee)}
                              disabled={checkingIn === attendee.id}
                              className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition disabled:opacity-50"
                            >
                              {checkingIn === attendee.id ? (
                                <Loader size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Check In
                            </button>
                            <button
                              onClick={() => handleDeclineCheckIn(attendee)}
                              disabled={checkingIn === attendee.id}
                              className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200 transition disabled:opacity-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
