/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { sendCommsEmail } from "@/lib/commsService";
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
  doc,
  updateDoc,
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
  BookingTier,
} from "@/types/booking";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { logError } from "@/lib/logger";
import { decrypt, isEncrypted } from "@/lib/generalWorkerService";
import { formatCurrency } from "@/types/currency";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function SlotAdder({ onAdd }: { onAdd: (slot: { startTime: string; endTime: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-orange-600 font-bold text-xs hover:underline">
      <Plus size={14} /> Add Slot
    </button>
  );
  return (
    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-card p-1.5 rounded text-xs" />
      <span className="text-xs text-muted-foreground">to</span>
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-card p-1.5 rounded text-xs" />
      <button onClick={() => { onAdd({ startTime: start, endTime: end }); setOpen(false); }} className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold">Add</button>
      <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground"><X size={14} /></button>
    </div>
  );
}

export default function BookingsPage() {
  const { creator, user, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [decryptedReasons, setDecryptedReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "rejected" | "availability" | "tiers">("requests");
  const [bookingMode, setBookingMode] = useState<"simple" | "tiered">("simple");
  const [tiers, setTiers] = useState<BookingTier[]>([]);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
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
  const defaultCurrency = (creator?.currency as "RWF" | "USD") || "RWF";
  const [hasMixedCurrencies, setHasMixedCurrencies] = useState(false);
  const [newSlot, setNewSlot] = useState({ startTime: "09:00", endTime: "10:00" });

  useEffect(() => {
    if (creator) {
      if (creator.bookingMode) setBookingMode(creator.bookingMode);
      if (creator.bookingTiers) setTiers(creator.bookingTiers);
      if (creator.bookingAvailability) setAvailability(creator.bookingAvailability);
      const existingTiers = (creator.bookingTiers || []) as BookingTier[];
      const otherCurrency = existingTiers.find((t) => t.currency && t.currency !== defaultCurrency);
      setHasMixedCurrencies(!!otherCurrency);
    }
  }, [creator, defaultCurrency]);

  useEffect(() => {
    if (!creator?.handle) return;
    const bookingsRef = collection(db, "bookingRequests");
    const q = query(bookingsRef, where("creatorHandle", "==", creator.handle), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, {
      next: async (snapshot) => {
        const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookingRequest[];
        setBookings(raw);
        const map: Record<string, string> = {};
        await Promise.all(raw.map(async (b) => {
          if (!b.reason) return;
          try {
            const plaintext = await decrypt(b.reason);
            if (plaintext && plaintext !== b.reason) map[b.id] = plaintext;
          } catch {
            logError("payment", "BookingsPage: Failed to decrypt booking reason", {
              creatorHandle: creator?.handle,
              creatorId: creator?.uid,
              metadata: { bookingId: b.id },
            });
          }
        }));
        setDecryptedReasons(map);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
    return () => unsub();
  }, [creator?.handle]);

  const handleRespond = async (bookingId: string, status: "accepted" | "declined", note?: string) => {
    try {
      await updateDoc(doc(db, "bookingRequests", bookingId), { status, respondedAt: serverTimestamp(), responseNote: note || "" });
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        await sendCommsEmail("booking_response", {
            bookerEmail: booking.bookerEmail,
            bookerName: booking.bookerName,
            creatorName: creator?.name,
            status,
            bookingDate: booking.preferredDate,
            bookingTime: booking.preferredTime,
            note,
            meetingLocation: booking.meetingLocation || "",
            preferredType: booking.preferredType,
            tierName: booking.tierName || "",
            creatorHandle: creator?.handle || "",
          });
      }
      toast.success(`Booking ${status}`);
    } catch {
      toast.error("Failed to respond");
      logError("payment", "BookingsPage: Failed to respond to booking", {
        creatorHandle: creator?.handle,
        creatorId: creator?.uid,
        metadata: { bookingId, status, ...(note !== undefined && { note }), creatorName: creator?.name },
      });
    }
  };

  const toggleDay = (day: number) => setAvailability((p) => ({ ...p, daysOfWeek: p.daysOfWeek.includes(day) ? p.daysOfWeek.filter((d) => d !== day) : [...p.daysOfWeek, day].sort() }));
  const addTimeSlot = () => {
    if (!newSlot.startTime || !newSlot.endTime) return;
    setAvailability((p) => ({ ...p, defaultSlots: [...p.defaultSlots, { id: Date.now().toString(), startTime: newSlot.startTime, endTime: newSlot.endTime }] }));
    setNewSlot({ startTime: "09:00", endTime: "10:00" });
    setShowAddSlot(false);
  };

  const removeTimeSlot = (id: string) => setAvailability((p) => ({ ...p, defaultSlots: p.defaultSlots.filter((s) => s.id !== id) }));

  const saveAvailability = async () => {
    if (!creator?.handle) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", creator.handle), { bookingAvailability: availability, bookingMode });
      toast.success("Availability saved!");
    } catch {
      toast.error("Failed to save");
      logError("payment", "BookingsPage: Failed to save availability", {
        creatorHandle: creator?.handle,
        creatorId: creator?.uid,
        metadata: { creatorName: creator?.name },
      });
    }
    finally { setSaving(false); }
  };

  const addTier = () => {
    const t: BookingTier = { id: Date.now().toString(), name: "", description: "", purpose: "", price: 0, priceUSD: 0, currency: defaultCurrency, duration: 30, access: "public", offers: [], availability: { daysOfWeek: [1, 2, 3, 4, 5], bookingType: "both", startDate: "", endDate: "", defaultSlots: [{ id: "1", startTime: "09:00", endTime: "10:00" }] }, active: true };
    setTiers([...tiers, t]);
    setEditingTierId(t.id);
  };

  const updateTier = (id: string, u: Partial<BookingTier>) => setTiers(tiers.map((t) => (t.id === id ? { ...t, ...u } : t)));
  const removeTier = (id: string) => { setTiers(tiers.filter((t) => t.id !== id)); if (editingTierId === id) setEditingTierId(null); };
  const addTierOffer = (id: string) => setTiers(tiers.map((t) => t.id === id ? { ...t, offers: [...t.offers, ""] } : t));
  const updateTierOffer = (id: string, i: number, v: string) => setTiers(tiers.map((t) => t.id === id ? { ...t, offers: t.offers.map((o, j) => j === i ? v : o) } : t));
  const removeTierOffer = (id: string, i: number) => setTiers(tiers.map((t) => t.id === id ? { ...t, offers: t.offers.filter((_, j) => j !== i) } : t));

  const addTierSlot = (id: string, slot: { startTime: string; endTime: string }) => setTiers(tiers.map((t) => t.id === id ? { ...t, availability: { ...t.availability, defaultSlots: [...t.availability.defaultSlots, { id: Date.now().toString(), startTime: slot.startTime, endTime: slot.endTime }] } } : t));
  const removeTierSlot = (id: string, sid: string) => setTiers(tiers.map((t) => t.id === id ? { ...t, availability: { ...t.availability, defaultSlots: t.availability.defaultSlots.filter((s) => s.id !== sid) } } : t));
  const toggleTierDay = (id: string, day: number) => setTiers(tiers.map((t) => t.id === id ? { ...t, availability: { ...t.availability, daysOfWeek: t.availability.daysOfWeek.includes(day) ? t.availability.daysOfWeek.filter((d) => d !== day) : [...t.availability.daysOfWeek, day].sort() } } : t));

  const saveTiers = async () => {
    if (!creator?.handle) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", creator.handle), { bookingTiers: tiers.filter((t) => t.name.trim()), bookingMode });
      toast.success("Tiers saved!");
    } catch {
      toast.error("Failed to save");
      logError("payment", "BookingsPage: Failed to save tiers", {
        creatorHandle: creator?.handle,
        creatorId: creator?.uid,
        metadata: { creatorName: creator?.name },
      });
    }
    finally { setSaving(false); }
  };

  const saveMode = async (mode: "simple" | "tiered") => {
    if (!creator?.handle) return;
    setBookingMode(mode);
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", creator.handle), { bookingMode: mode });
      toast.success(`Switched to ${mode} booking`);
    } catch {
      toast.error("Failed to save");
      logError("payment", "BookingsPage: Failed to switch booking mode", {
        creatorHandle: creator?.handle,
        creatorId: creator?.uid,
        metadata: { mode, creatorName: creator?.name },
      });
    }
    finally { setSaving(false); }
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const rejectedBookings = bookings.filter((b) => b.status === "declined");
  const upcomingBookings = bookings.filter((b) => b.status === "accepted");

  const formatDate = (date: string | Timestamp | Date) => {
    if (!date) return "";
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader className="animate-spin text-orange-600" size={32} /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tighter uppercase">Book a Meeting</h1>
          <p className="text-muted-foreground font-medium">Manage booking requests and set your availability.</p>
        </header>

        <div className="flex gap-4 mb-8">
          <button onClick={() => setActiveTab("requests")} className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${activeTab === "requests" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"}`}>
            Booking Requests
            {pendingBookings.length > 0 && <span className="ml-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingBookings.length}</span>}
          </button>
          <button onClick={() => setActiveTab("availability")} className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${activeTab === "availability" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"}`}>Availability</button>
          <button onClick={() => setActiveTab("tiers")} className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${activeTab === "tiers" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"}`}>Tiers</button>
          <button onClick={() => setActiveTab("rejected")} className={`px-6 py-3 rounded-lg font-black text-sm transition-all ${activeTab === "rejected" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"}`}>
            Rejected
            {rejectedBookings.length > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{rejectedBookings.length}</span>}
          </button>
        </div>

        {activeTab === "requests" && (
          <div className="space-y-8">
            {pendingBookings.length > 0 && (
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Clock className="text-orange-500" size={20} /> Pending Requests</h2>
                <div className="space-y-4">
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="p-4 bg-muted rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-lg">{booking.bookerName}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Mail size={14} />{booking.bookerEmail}</span>
                            {booking.bookerPhone && <span className="flex items-center gap-1"><Phone size={14} />{booking.bookerPhone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleRespond(booking.id, "accepted")} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check size={18} /></button>
                          <button onClick={() => handleRespond(booking.id, "declined")} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><X size={18} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm"><CalendarDays size={16} className="text-muted-foreground" /><span>{formatDate(booking.preferredDate)}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Clock size={16} className="text-muted-foreground" /><span>{booking.preferredTime}</span></div>
                        <div className="flex items-center gap-2 text-sm">{booking.preferredType === "online" ? <Video size={16} className="text-muted-foreground" /> : <MapPin size={16} className="text-muted-foreground" />}<span className="capitalize">{booking.preferredType} Meeting</span></div>
                      </div>
                      {(booking.tierName || booking.paymentStatus && booking.paymentStatus !== "none") && (
                        <div className="flex items-center gap-3 mb-4">
                          {booking.tierName && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">{booking.tierName}</span>}
                          {booking.paymentStatus === "paid" && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Paid</span>}
                          {booking.paymentStatus === "pending" && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">Payment Pending</span>}
                          {(booking.paymentAmount || 0) > 0 && <span className="text-xs text-muted-foreground">{formatCurrency(booking.paymentAmount || 0, booking.currency || "RWF")}</span>}
                        </div>
                      )}
                      {(() => {
                        const r = decryptedReasons[booking.id] || (!isEncrypted(booking.reason || "") ? booking.reason : "");
                        return r ? <div className="p-3 bg-card rounded-lg border border-border"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Reason</p><p className="text-sm">{r}</p></div> : null;
                      })()}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {upcomingBookings.length > 0 && (
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Calendar className="text-green-500" size={20} /> Upcoming Meetings</h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
                      <div className="flex justify-between items-start">
                        <div><p className="font-black text-lg">{booking.bookerName}</p><p className="text-sm text-muted-foreground">{booking.bookerEmail}</p></div>
                        <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">Confirmed</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm"><CalendarDays size={16} className="text-muted-foreground" /><span>{formatDate(booking.preferredDate)}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Clock size={16} className="text-muted-foreground" /><span>{booking.preferredTime}</span></div>
                        <div className="flex items-center gap-2 text-sm">{booking.preferredType === "online" ? <Video size={16} /> : <MapPin size={16} />}<span className="capitalize">{booking.preferredType}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {bookings.length === 0 && <div className="bg-card border border-border rounded-lg p-12 text-center"><Calendar className="mx-auto text-muted-foreground mb-4" size={48} /><p className="text-muted-foreground font-medium">No booking requests yet</p><p className="text-sm text-muted-foreground mt-2">When someone books a meeting with you, it will appear here.</p></div>}
          </div>
        )}

        {activeTab === "rejected" && (
          <div className="space-y-6">
            {rejectedBookings.length > 0 ? rejectedBookings.map((booking) => (
              <div key={booking.id} className="bg-card border border-red-100 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><p className="font-black text-lg">{booking.bookerName}</p><span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Rejected</span></div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1"><span className="flex items-center gap-1"><Mail size={14} />{booking.bookerEmail}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-1"><Calendar size={14} />{booking.preferredDate}</div>
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Clock size={14} />{booking.preferredTime}</div>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground mb-4"><p className="font-bold mb-1">Reason:</p><p>{decryptedReasons[booking.id] || (!isEncrypted(booking.reason || "") ? booking.reason : null) || "No reason provided."}</p></div>
                {booking.responseNote && <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700"><p className="font-bold mb-1">Note:</p><p>{booking.responseNote}</p></div>}
              </div>
            )) : <div className="bg-card border border-dashed border-border rounded-3xl p-16 text-center"><p className="text-muted-foreground text-lg font-medium">No rejected bookings</p></div>}
          </div>
        )}

        {activeTab === "availability" && (
          <div className="bg-card border border-border rounded-lg p-8 space-y-8">
            <div>
              <h2 className="text-lg font-black uppercase mb-4">Available Days</h2>
              <div className="flex gap-3 flex-wrap">
                {DAYS_OF_WEEK.map((day, index) => (
                  <button key={day} onClick={() => toggleDay(index)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${availability.daysOfWeek.includes(index) ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black uppercase mb-4">Meeting Type</h2>
              <div className="flex gap-3">
                {(["online", "physical", "both"] as const).map((type) => (
                  <button key={type} onClick={() => setAvailability((p) => ({ ...p, bookingType: type }))} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${availability.bookingType === type ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>
                    {type === "online" && <Video size={16} />}{type === "physical" && <MapPin size={16} />}{type === "both" && <Users size={16} />}
                    <span className="capitalize">{type === "both" ? "Both" : type === "physical" ? "In Person" : "Online"}</span>
                  </button>
                ))}
              </div>
            </div>
            {availability.bookingType !== "online" && (
              <div><h2 className="text-lg font-black uppercase mb-4">Location</h2><input type="text" value={availability.location || ""} onChange={(e) => setAvailability((p) => ({ ...p, location: e.target.value }))} placeholder="Enter meeting location or address" className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none" /></div>
            )}
            {availability.bookingType !== "physical" && (
              <div><h2 className="text-lg font-black uppercase mb-4">Online Meeting Link</h2><input type="text" value={availability.onlineLink || ""} onChange={(e) => setAvailability((p) => ({ ...p, onlineLink: e.target.value }))} placeholder="Zoom, Google Meet, or video call link" className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none" /></div>
            )}
            <div>
              <h2 className="text-lg font-black uppercase mb-4">Available Time Slots</h2>
              <div className="space-y-3">
                {availability.defaultSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <Clock size={18} className="text-muted-foreground" /><span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                    <button onClick={() => removeTimeSlot(slot.id)} className="ml-auto p-1 text-muted-foreground hover:text-red-500"><X size={16} /></button>
                  </div>
                ))}
                {showAddSlot ? (
                  <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))} className="bg-card p-2 rounded-lg text-sm font-medium" />
                    <span className="text-muted-foreground">to</span>
                    <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((p) => ({ ...p, endTime: e.target.value }))} className="bg-card p-2 rounded-lg text-sm font-medium" />
                    <button onClick={addTimeSlot} className="ml-auto px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600">Add</button>
                    <button onClick={() => setShowAddSlot(false)} className="p-2 text-muted-foreground"><X size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddSlot(true)} className="flex items-center gap-2 px-4 py-3 text-orange-600 font-bold text-sm hover:bg-orange-50 rounded-lg"><Plus size={18} /> Add Time Slot</button>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowClearModal(true)} disabled={saving} className="flex-1 bg-red-50 text-red-600 py-3 px-4 rounded-lg font-bold text-sm hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50"><X size={16} /> Clear Availability</button>
              <button onClick={saveAvailability} disabled={saving} className="flex-1 bg-foreground text-background px-8 py-3 rounded-lg font-black flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50">{saving ? <Loader className="animate-spin" size={18} /> : <Check size={18} />} Save</button>
            </div>
          </div>
        )}

        {activeTab === "tiers" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-black uppercase mb-4">Booking Mode</h2>
              <div className="flex gap-3">
                <button onClick={() => saveMode("simple")} disabled={saving} className={`flex-1 py-4 rounded-lg font-bold text-sm transition-all ${bookingMode === "simple" ? "bg-foreground text-background ring-2 ring-orange-500" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>Simple Booking</button>
                <button onClick={() => saveMode("tiered")} disabled={saving} className={`flex-1 py-4 rounded-lg font-bold text-sm transition-all ${bookingMode === "tiered" ? "bg-foreground text-background ring-2 ring-orange-500" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>Tiered Booking</button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{bookingMode === "simple" ? "Simple booking uses one availability schedule. All bookings use the same rules." : "Tiered booking lets you create multiple booking packages with different prices, availability, and access levels."}</p>
            </div>

            {bookingMode === "tiered" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black uppercase">Booking Tiers</h2>
                  <button onClick={addTier} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600"><Plus size={16} /> Add Tier</button>
                </div>

                {tiers.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center"><p className="text-muted-foreground text-lg font-medium">No tiers yet</p><p className="text-sm text-muted-foreground mt-2">Add your first booking tier to get started.</p></div>
                ) : (
                  <div className="space-y-6">
                    {tiers.map((tier) => (
                      <div key={tier.id} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-muted cursor-pointer" onClick={() => setEditingTierId(editingTierId === tier.id ? null : tier.id)}>
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${tier.active ? "bg-green-500" : "bg-gray-300"}`} />
                            <div><p className="font-bold">{tier.name || "Untitled Tier"}</p><p className="text-xs text-muted-foreground">{tier.price > 0 ? formatCurrency(tier.price, tier.currency || "RWF") : "Free"} &middot; {tier.duration}min &middot; {tier.access}</p></div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeTier(tier.id); }} className="p-2 text-muted-foreground hover:text-red-500"><X size={16} /></button>
                        </div>

                        {editingTierId === tier.id && (
                          <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2"><label className="text-sm font-bold">Tier Name</label><input type="text" value={tier.name} onChange={(e) => updateTier(tier.id, { name: e.target.value })} placeholder="e.g. Basic, Premium, VIP" className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" /></div>
                              {hasMixedCurrencies && (
                                <div className="space-y-2">
                                  <label className="text-sm font-bold">Currency</label>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => updateTier(tier.id, { currency: "RWF" })}
                                      className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${(tier.currency || defaultCurrency) === "RWF" ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground border border-border"}`}>RWF</button>
                                    <button type="button" onClick={() => updateTier(tier.id, { currency: "USD" })}
                                      className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${tier.currency === "USD" ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground border border-border"}`}>USD</button>
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                <label className="text-sm font-bold">Price ({(tier.currency || "RWF") === "USD" ? "USD" : "RWF"})</label>
                                <input type="number" min={0} value={(tier.currency || "RWF") === "USD" ? (tier.priceUSD ?? "") : (tier.price || "")}
                                  onChange={(e) => updateTier(tier.id, (tier.currency || "RWF") === "USD" ? { priceUSD: Number(e.target.value) } : { price: Number(e.target.value) })}
                                  placeholder={(tier.currency || "RWF") === "USD" ? "10" : "5000"}
                                  className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" />
                              </div>
                              {tier.currency === "USD" && (
                                <div className="space-y-2">
                                  <label className="text-sm font-bold">Price (RWF)</label>
                                  <input type="number" min={0} value={tier.price || ""}
                                    onChange={(e) => updateTier(tier.id, { price: Number(e.target.value) })}
                                    placeholder="RWF equivalent"
                                    className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" />
                                  <p className="text-[10px] text-muted-foreground mt-1">RWF equivalent for local payments</p>
                                </div>
                              )}
                              <div className="space-y-2"><label className="text-sm font-bold">Duration (minutes)</label><input type="number" value={tier.duration} onChange={(e) => updateTier(tier.id, { duration: Number(e.target.value) })} placeholder="30" className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" /></div>
                              <div className="space-y-2"><label className="text-sm font-bold">Access</label><select value={tier.access} onChange={(e) => updateTier(tier.id, { access: e.target.value as "public" | "supporters" })} className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none"><option value="public">Anyone</option><option value="supporters">Supporters Only</option></select></div>
                            </div>
                            <div className="space-y-2"><label className="text-sm font-bold">Description</label><textarea value={tier.description} onChange={(e) => updateTier(tier.id, { description: e.target.value })} placeholder="Describe what this tier offers..." rows={2} className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none resize-none" /></div>
                            <div className="space-y-2"><label className="text-sm font-bold">Purpose</label><textarea value={tier.purpose} onChange={(e) => updateTier(tier.id, { purpose: e.target.value })} placeholder="What is this meeting for?" rows={2} className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none resize-none" /></div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between"><label className="text-sm font-bold">What&apos;s Included</label><button onClick={() => addTierOffer(tier.id)} className="text-xs text-orange-600 font-bold hover:underline">+ Add Offer</button></div>
                              {tier.offers.map((offer, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input type="text" value={offer} onChange={(e) => updateTierOffer(tier.id, idx, e.target.value)} placeholder="e.g. 30min 1-on-1 consultation" className="flex-1 bg-muted p-3 rounded-lg text-sm font-medium outline-none" />
                                  <button onClick={() => removeTierOffer(tier.id, idx)} className="p-2 text-muted-foreground hover:text-red-500"><X size={14} /></button>
                                </div>
                              ))}
                            </div>

                            <div className="border-t border-border pt-5">
                              <h4 className="text-sm font-bold mb-4">Availability for this Tier</h4>
                              <div className="mb-4"><label className="text-sm font-bold block mb-2">Available Days</label>
                                <div className="flex gap-2 flex-wrap">{DAYS_OF_WEEK.map((day, index) => (<button key={day} onClick={() => toggleTierDay(tier.id, index)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${tier.availability.daysOfWeek.includes(index) ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>{day.slice(0, 3)}</button>))}</div>
                              </div>
                              <div className="mb-4"><label className="text-sm font-bold block mb-2">Meeting Type</label>
                                <div className="flex gap-2">{(["online", "physical", "both"] as const).map((type) => (<button key={type} onClick={() => updateTier(tier.id, { availability: { ...tier.availability, bookingType: type } })} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${tier.availability.bookingType === type ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>{type === "online" ? "Online" : type === "physical" ? "In Person" : "Both"}</button>))}</div>
                              </div>
                              {tier.availability.bookingType !== "online" && <div className="mb-4"><label className="text-sm font-bold block mb-2">Location</label><input type="text" value={tier.availability.location || ""} onChange={(e) => updateTier(tier.id, { availability: { ...tier.availability, location: e.target.value } })} placeholder="Meeting location" className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" /></div>}
                              {tier.availability.bookingType !== "physical" && <div className="mb-4"><label className="text-sm font-bold block mb-2">Online Link</label><input type="text" value={tier.availability.onlineLink || ""} onChange={(e) => updateTier(tier.id, { availability: { ...tier.availability, onlineLink: e.target.value } })} placeholder="Zoom/Google Meet link" className="w-full bg-muted p-3 rounded-lg text-sm font-medium outline-none" /></div>}
                              <div><label className="text-sm font-bold block mb-2">Time Slots</label>
                                <div className="space-y-2">
                                  {tier.availability.defaultSlots.map((slot) => (<div key={slot.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg"><Clock size={14} className="text-muted-foreground" /><span className="text-sm font-medium">{slot.startTime} - {slot.endTime}</span><button onClick={() => removeTierSlot(tier.id, slot.id)} className="ml-auto p-1 text-muted-foreground hover:text-red-500"><X size={14} /></button></div>))}
                                  <SlotAdder onAdd={(slot) => addTierSlot(tier.id, slot)} />
                                </div>
                              </div>
                            </div>
                            <label className="flex items-center gap-3 pt-2 border-t border-border"><input type="checkbox" checked={tier.active} onChange={(e) => updateTier(tier.id, { active: e.target.checked })} className="w-4 h-4 rounded border-border" /><span className="text-sm font-medium">Active</span></label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={saveTiers} disabled={saving} className="w-full bg-foreground text-background py-4 rounded-lg font-black flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50">
                  {saving ? <Loader className="animate-spin" size={18} /> : <Check size={18} />} Save All Tiers
                </button>
              </>
            )}
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
            await updateDoc(doc(db, "creators", creator.handle), { bookingAvailability: null });
            setAvailability({ daysOfWeek: [], bookingType: "both", startDate: "", endDate: "", defaultSlots: [] });
            toast.success("Availability cleared");
            setShowClearModal(false);
          } catch {
            toast.error("Failed to clear");
            logError("payment", "BookingsPage: Failed to clear availability", {
              creatorHandle: creator?.handle,
              creatorId: creator?.uid,
              metadata: { creatorName: creator?.name },
            });
          }
          finally { setSaving(false); }
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
