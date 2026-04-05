/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Check,
  X,
  Plus,
  Loader,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  Phone,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import {
  BookingRequest,
  BookingAvailability,
  BookingTimeSlot,
  BookingStatus,
  BookingType,
} from "@/types/booking";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BookingsPage() {
  const { creator, user, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "availability">("requests");
  const [availability, setAvailability] = useState<BookingAvailability>({
    daysOfWeek: [1, 2, 3, 4, 5],
    bookingType: "both",
    startDate: "",
    endDate: "",
    defaultSlots: [
      { id: "1", startTime: "09:00", endTime: "10:00" },
      { id: "2", startTime: "10:00", endTime: "11:00" },
      { id: "3", startTime: "14:00", endTime: "15:00" },
    ],
  });
  const [saving, setSaving] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ startTime: "09:00", endTime: "10:00" });

  useEffect(() => {
    if (!creator?.uid) return;

    const bookingsRef = collection(db, "bookingRequests");
    const q = query(
      bookingsRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, {
      next: (snapshot) => {
        const bookingsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BookingRequest[];
        setBookings(bookingsData);
        setLoading(false);
      },
      error: (error) => {
        console.error("Bookings snapshot error:", error);
        setLoading(false);
      },
    });

    return () => unsub();
  }, [creator?.uid]);

  const handleRespond = async (bookingId: string, status: "accepted" | "declined", note?: string) => {
    try {
      await updateDoc(doc(db, "bookingRequests", bookingId), {
        status,
        respondedAt: serverTimestamp(),
        responseNote: note || "",
      });

      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        await fetch("/api/comms/email/booking/response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookerEmail: booking.bookerEmail,
            bookerName: booking.bookerName,
            creatorName: creator?.name,
            status,
            bookingDate: booking.preferredDate,
            bookingTime: booking.preferredTime,
            note,
          }),
        });
      }

      toast.success(`Booking ${status}`);
    } catch (error) {
      console.error("Error responding to booking:", error);
      toast.error("Failed to respond");
    }
  };

  const toggleDay = (day: number) => {
    setAvailability((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  const addTimeSlot = () => {
    if (!newSlot.startTime || !newSlot.endTime) return;
    setAvailability((prev) => ({
      ...prev,
      defaultSlots: [
        ...prev.defaultSlots,
        { id: Date.now().toString(), startTime: newSlot.startTime, endTime: newSlot.endTime },
      ],
    }));
    setNewSlot({ startTime: "09:00", endTime: "10:00" });
    setShowAddSlot(false);
  };

  const removeTimeSlot = (id: string) => {
    setAvailability((prev) => ({
      ...prev,
      defaultSlots: prev.defaultSlots.filter((s) => s.id !== id),
    }));
  };

  const saveAvailability = async () => {
    if (!creator?.handle) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", creator.handle), {
        bookingAvailability: availability,
      });
      toast.success("Availability saved!");
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter((b) => b.status === "accepted");
  const pastBookings = bookings.filter((b) => ["completed", "declined", "cancelled"].includes(b.status));

  const formatDate = (date: string | Timestamp | Date) => {
    if (!date) return "";
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader className="animate-spin text-orange-600" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tighter uppercase">
            Book a Meeting
          </h1>
          <p className="text-slate-500 font-medium">
            Manage booking requests and set your availability.
          </p>
        </header>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${
              activeTab === "requests"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Booking Requests
            {pendingBookings.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
                {pendingBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("availability")}
            className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${
              activeTab === "availability"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Availability
          </button>
        </div>

        {activeTab === "requests" && (
          <div className="space-y-8">
            {pendingBookings.length > 0 && (
              <section className="bg-white border border-slate-100 rounded-lg p-6">
                <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                  <Clock className="text-orange-500" size={20} />
                  Pending Requests
                </h2>
                <div className="space-y-4">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-lg">{booking.bookerName}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {booking.bookerEmail}
                            </span>
                            {booking.bookerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone size={14} />
                                {booking.bookerPhone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(booking.id, "accepted")}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleRespond(booking.id, "declined")}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays size={16} className="text-slate-400" />
                          <span>{formatDate(booking.preferredDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={16} className="text-slate-400" />
                          <span>{booking.preferredTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {booking.preferredType === "online" ? (
                            <Video size={16} className="text-slate-400" />
                          ) : (
                            <MapPin size={16} className="text-slate-400" />
                          )}
                          <span className="capitalize">{booking.preferredType} Meeting</span>
                        </div>
                      </div>

                      {booking.reason && (
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                          <p className="text-xs font-black uppercase text-slate-400 mb-1">Reason</p>
                          <p className="text-sm">{booking.reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {upcomingBookings.length > 0 && (
              <section className="bg-white border border-slate-100 rounded-lg p-6">
                <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                  <Calendar className="text-green-500" size={20} />
                  Upcoming Meetings
                </h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-green-50 rounded-lg border border-green-100"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-lg">{booking.bookerName}</p>
                          <p className="text-sm text-slate-500">{booking.bookerEmail}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                          Confirmed
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays size={16} className="text-slate-400" />
                          <span>{formatDate(booking.preferredDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={16} className="text-slate-400" />
                          <span>{booking.preferredTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {booking.preferredType === "online" ? (
                            <Video size={16} className="text-slate-400" />
                          ) : (
                            <MapPin size={16} className="text-slate-400" />
                          )}
                          <span className="capitalize">{booking.preferredType}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {bookings.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-lg p-12 text-center">
                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No booking requests yet</p>
                <p className="text-sm text-slate-400 mt-2">
                  When someone books a meeting with you, it will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "availability" && (
          <div className="bg-white border border-slate-100 rounded-lg p-8 space-y-8">
            <div>
              <h2 className="text-lg font-black uppercase mb-4">Available Days</h2>
              <div className="flex gap-3 flex-wrap">
                {DAYS_OF_WEEK.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(index)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      availability.daysOfWeek.includes(index)
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-black uppercase mb-4">Meeting Type</h2>
              <div className="flex gap-3">
                {(["online", "physical", "both"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAvailability((prev) => ({ ...prev, bookingType: type }))}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                      availability.bookingType === type
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {type === "online" && <Video size={16} />}
                    {type === "physical" && <MapPin size={16} />}
                    {type === "both" && <Users size={16} />}
                    <span className="capitalize">{type === "both" ? "Both" : type === "physical" ? "In Person" : "Online"}</span>
                  </button>
                ))}
              </div>
            </div>

            {availability.bookingType !== "online" && (
              <div>
                <h2 className="text-lg font-black uppercase mb-4">Location</h2>
                <input
                  type="text"
                  value={availability.location || ""}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter meeting location or address"
                  className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                />
              </div>
            )}

            {availability.bookingType !== "physical" && (
              <div>
                <h2 className="text-lg font-black uppercase mb-4">Online Meeting Link</h2>
                <input
                  type="text"
                  value={availability.onlineLink || ""}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, onlineLink: e.target.value }))}
                  placeholder="Zoom, Google Meet, or video call link"
                  className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                />
              </div>
            )}

            <div>
              <h2 className="text-lg font-black uppercase mb-4">Available Time Slots</h2>
              <div className="space-y-3">
                {availability.defaultSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                  >
                    <Clock size={18} className="text-slate-400" />
                    <span className="font-medium">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <button
                      onClick={() => removeTimeSlot(slot.id)}
                      className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {showAddSlot ? (
                  <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <input
                      type="time"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="bg-white p-2 rounded-lg text-sm font-medium"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="bg-white p-2 rounded-lg text-sm font-medium"
                    />
                    <button
                      onClick={addTimeSlot}
                      className="ml-auto px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition-all"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddSlot(false)}
                      className="p-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddSlot(true)}
                    className="flex items-center gap-2 px-4 py-3 text-orange-600 font-bold text-sm hover:bg-orange-50 rounded-lg transition-all"
                  >
                    <Plus size={18} />
                    Add Time Slot
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(true)}
                disabled={saving}
                className="flex-1 bg-red-50 text-red-600 py-3 px-4 rounded-lg font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X size={16} />
                Clear Availability
              </button>
              <button
                onClick={saveAvailability}
                disabled={saving}
                className="flex-1 bg-slate-900 text-white px-8 py-3 rounded-lg font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl disabled:opacity-50"
              >
                {saving ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={async () => {
          if (!creator?.handle) return;
          setSaving(true);
          try {
            await updateDoc(doc(db, "creators", creator.handle), {
              bookingAvailability: null,
            });
            setAvailability({
              daysOfWeek: [],
              bookingType: "both",
              startDate: "",
              endDate: "",
              defaultSlots: [],
            });
            toast.success("Availability cleared");
            setShowClearModal(false);
          } catch (error) {
            console.error("Error clearing availability:", error);
            toast.error("Failed to clear");
          } finally {
            setSaving(false);
          }
        }}
        title="Clear Availability?"
        message="This will hide the booking option on your public page. You can set it up again later."
        confirmText="Clear"
        loading={saving}
        variant="danger"
      />
    </div>
  );
}
