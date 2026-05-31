/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Wallet,
  ArrowRight,
  Globe,
  Ticket,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDocs,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Edit } from "lucide-react";
import { logActivity } from "@/lib/logger";
import Link from "next/link";
import type { EventType } from "@/components/parts/public/gatherings/types";

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  public: <Globe size={16} />,
  supporters: <ShieldCheck size={16} />,
  supporters_tiered: <ShieldCheck size={16} />,
  ticketed: <Ticket size={16} />,
};

const EVENT_TYPE_LABELS_SHORT: Record<string, string> = {
  public: "Public",
  supporters: "Supporters",
  supporters_tiered: "Tiered",
  ticketed: "Ticketed",
};

export default function GatheringsPage() {
  const { creator } = useAuth();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [scanMode, setScanMode] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeEventRef = useRef<any>(null);
  const handleCheckInRef = useRef<any>(null);
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
  activeEventRef.current = activeEvent;

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
    window.location.href = `/creator/gatherings/${event.id}/edit`;
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
  handleCheckInRef.current = handleCheckIn;

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

  // Manage QR scanner lifecycle
  useEffect(() => {
    if (!showCheckIn) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    if (!scanMode) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          const ev = activeEventRef.current;
          const checkIn = handleCheckInRef.current;
          if (!ev) return;

          await scanner.stop().catch(() => {});
          scannerRef.current = null;

          try {
            const docRef = doc(db, "gatheringsAttendance", decodedText);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
              toast.error("Invalid ticket: not found");
              setScanMode(false);
              return;
            }

            const data = docSnap.data();
            if (data.gatheringId !== ev.id) {
              toast.error("This ticket is for a different event");
              setScanMode(false);
              return;
            }

            if (data.checkedIn) {
              toast.info(`${data.supporterName || "Someone"} is already checked in`);
              setScanMode(false);
              return;
            }

            await checkIn({ id: decodedText, ...data });
            toast.success(`${data.supporterName || "Attendee"} checked in via QR!`);
            setScanMode(false);
          } catch (e) {
            console.error("QR scan error:", e);
            toast.error("Failed to process ticket");
            setScanMode(false);
          }
        },
        () => {},
      )
      .catch((err) => {
        console.error("QR scanner start failed:", err);
        toast.error("Camera access failed. Check permissions.");
        setScanMode(false);
      });

    return () => {
      scanner.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [showCheckIn, scanMode]);

  const handleQrScan = useCallback(async (attendanceDocId: string) => {
    if (!activeEvent) return;

    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    try {
      const docRef = doc(db, "gatheringsAttendance", attendanceDocId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        toast.error("Invalid ticket: not found");
        setScanMode(false);
        return;
      }

      const data = docSnap.data();
      if (data.gatheringId !== activeEvent.id) {
        toast.error("This ticket is for a different event");
        setScanMode(false);
        return;
      }

      if (data.checkedIn) {
        toast.info(`${data.supporterName || "Someone"} is already checked in`);
        setScanMode(false);
        return;
      }

      await handleCheckIn({ id: attendanceDocId, ...data });
      toast.success(`${data.supporterName || "Attendee"} checked in via QR!`);
      setScanMode(false);
    } catch (e) {
      console.error("QR scan error:", e);
      toast.error("Failed to process ticket");
      setScanMode(false);
    }
  }, [activeEvent]);
  const totalTicketRevenue = attendees
    .filter((a) => a.paid)
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const platformSharePct = Number(process.env.NEXT_PUBLIC_PLATFORM_SHARE) || 0.1;
  const creatorSharePct = Number(process.env.NEXT_PUBLIC_CREATOR_SHARE) || 0.9;
  const platformFee = totalTicketRevenue * platformSharePct;
  const creatorNet = totalTicketRevenue * creatorSharePct;

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
        <Link
          href="/creator/gatherings/new"
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
        >
          <Plus size={18} /> Plan Event
        </Link>
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
                      {EVENT_TYPE_LABELS_SHORT[activeEvent.eventType] || (activeEvent.ticketPrice > 0 ? "Ticketed" : "Public")}
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

                {/* Finance Overview */}
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
                    setScanMode(false);
                  }}
                  className="p-2 hover:bg-muted rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 pt-2 pb-0">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setScanMode(false)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                      !scanMode
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-card"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setScanMode(true)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                      scanMode
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-card"
                    }`}
                  >
                    <QrCode size={14} className="inline mr-1" /> Scan QR
                  </button>
                </div>
              </div>

              {scanMode ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
                  <div id="qr-reader" className="w-full max-w-xs" />
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Point the camera at an attendee&apos;s QR ticket
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
