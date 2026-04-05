/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
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

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    minSupportTier: 0,
    capacity: 20,
  });
  useEffect(() => {
    if (!creator) return;

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
  }, [creator]);

  const activeEvent = events[selectedEventIndex];

  useEffect(() => {
    if (!activeEvent?.id) {
      setAttendees([]);
      return;
    }

    const fetchAttendees = async () => {
      const attendanceRef = collection(db, "gatheringsAttendance");
      const q = query(
        attendanceRef,
        where("gatheringId", "==", activeEvent.id),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const attendeeData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendees(attendeeData);
    };

    fetchAttendees();
  }, [activeEvent?.id]);

  const handleCreate = async () => {
    if (!creator || !formData.title) return;

    setIsSimulating(true);
    try {
      if (editingEvent) {
        await updateDoc(doc(db, "creatorGatherings", editingEvent.id), {
          ...formData,
        });
        toast.success("Event updated!");
        setEditingEvent(null);
      } else {
        await addDoc(collection(db, "creatorGatherings"), {
          creatorId: creator.uid,
          ...formData,
          attendeesCount: 0,
          status: "Upcoming",
          createdAt: serverTimestamp(),
        });
        toast.success("Event created!");
      }
      setIsCreating(false);
      setFormData({
        title: "",
        date: "",
        time: "",
        location: "",
        minSupportTier: 0,
        capacity: 20,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to save event");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "creatorGatherings", eventId), {
        status: newStatus,
      });
      toast.success(`Event ${newStatus === "Upcoming" ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "creatorGatherings", isDeleting));
      toast.success("Event deleted");
      setIsDeleting(null);
      setSelectedEventIndex(0);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      date: event.date || "",
      time: event.time || "",
      location: event.location || "",
      minSupportTier: event.minSupportTier || 0,
      capacity: event.capacity || 20,
    });
    setIsCreating(true);
  };

  const handleCheckIn = async (attendee: any) => {
    setCheckingIn(attendee.id);
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
          eventLocation: activeEvent.location,
        }),
      }).catch(() => {});

      toast.success(`${attendee.supporterName} checked in!`);
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in guest");
    } finally {
      setCheckingIn(null);
    }
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.supporterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.supporterEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 uppercase">Gatherings</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg shadow-orange-100 mb-8"
        >
          <Plus size={18} /> Plan Event
        </button>
      </aside>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 p-8 border-r border-slate-100 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              All Events
            </h3>
            <span className="text-xs font-bold text-orange-600">
              {events.filter(e => e.status === "Upcoming").length} Active
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              <Loader className="animate-spin mx-auto text-slate-300" />
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-100">
                <Calendar className="mx-auto text-slate-200 mb-4" size={40} />
                <p className="text-slate-500 font-medium">No events yet</p>
                <p className="text-sm text-slate-400 mt-2">Create your first event to get started</p>
              </div>
            ) : (
              events.map((event, index) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventIndex(index)}
                  className={`w-full text-left p-6 rounded-lg border transition-all ${
                    selectedEventIndex === index
                      ? "bg-white border-orange-500 shadow-xl scale-[1.01]"
                      : event.status !== "Upcoming"
                      ? "bg-slate-50 border-slate-200 opacity-60"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`p-3 rounded-lg ${event.minSupportTier > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-900"}`}
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
                          handleUpdateStatus(event.id, event.status === "Upcoming" ? "Disabled" : "Upcoming");
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase transition ${
                          event.status === "Upcoming"
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                        }`}
                        title={event.status === "Upcoming" ? "Click to disable" : "Click to enable"}
                      >
                        {event.status}
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold mb-1">{event.title}</h4>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-slate-300" />{" "}
                    {event.location}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="text-xs font-bold text-slate-400">
                      {event.attendeesCount || 0} RSVPs
                    </div>
                    <ChevronRight
                      size={16}
                      className={
                        selectedEventIndex === index
                          ? "text-orange-500"
                          : "text-slate-300"
                      }
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="w-full md:w-96 bg-white p-8 overflow-y-auto">
          {activeEvent ? (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-lg">Event Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(activeEvent)}
                    className="p-2 text-slate-300 hover:text-orange-500 transition"
                    title="Edit Event"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setIsDeleting(activeEvent.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition"
                    title="Delete Event"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-lg text-white">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Entry Requirement
                    </p>
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {attendees.length}{activeEvent.capacity ? `/${activeEvent.capacity}` : ""} spots
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">
                    {activeEvent.minSupportTier > 0
                      ? `Min. Support: ${activeEvent.minSupportTier} RWF`
                      : "Open to Everyone"}
                  </h2>
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
                    <h4 className="font-bold text-sm">RSVPs ({attendees.length})</h4>
                  </div>
                  {attendees.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {attendees.map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                            {attendee.supporterName?.[0] || <User size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">
                              {attendee.supporterName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {attendee.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <Users size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-400">No RSVPs yet</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowCheckIn(true)}
                  disabled={attendees.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 transition disabled:opacity-50"
                >
                  <QrCode size={20} /> Check-in Guests
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">Select an event to manage</p>
            </div>
          )}
        </div>

        {/* --- Create Event Modal --- */}
        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-lg p-10 shadow-2xl animate-in zoom-in-95">
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
                      date: "",
                      time: "",
                      location: "",
                      minSupportTier: 0,
                      capacity: 20,
                    });
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="Gathering Title"
                  value={formData.title}
                  className="w-full text-xl font-bold outline-none border-b-2 border-slate-50 pb-2 focus:border-orange-500 transition placeholder:text-slate-200"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Location (Physical or Digital link)"
                  value={formData.location}
                  className="w-full text-sm font-bold outline-none border-b border-slate-50 pb-2 focus:border-orange-500 transition"
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={formData.date}
                    className="bg-slate-50 p-4 rounded-lg text-sm outline-none font-bold"
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                  <input
                    type="time"
                    value={formData.time}
                    className="bg-slate-50 p-4 rounded-lg text-sm outline-none font-bold"
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Entry Threshold (Support Amount)
                  </label>
                  <input
                    type="number"
                    placeholder="Min. RWF support to qualify (0 for all)"
                    className="w-full bg-slate-50 p-4 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minSupportTier: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-400">
                    If set, only supporters who have contributed this amount or
                    more can see this.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Event Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Max attendees (leave empty for unlimited)"
                    className="w-full bg-slate-50 p-4 rounded-lg text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-400">
                    Set a limit on how many supporters can RSVP.
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!formData.title || isSimulating}
                  className="w-full bg-slate-900 text-white py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Check-in Guests</h2>
                  <p className="text-sm text-slate-500">
                    {checkedInCount} / {attendees.length} checked in
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCheckIn(false);
                    setSearchQuery("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                {filteredAttendees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-medium">
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
                          : "bg-white border-slate-100 hover:border-slate-200"
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
                          <p className="text-xs text-slate-400">{attendee.supporterEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.checkedIn ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                            <Check size={16} /> Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(attendee)}
                            disabled={checkingIn === attendee.id}
                            className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50"
                          >
                            {checkingIn === attendee.id ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Check In
                          </button>
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
