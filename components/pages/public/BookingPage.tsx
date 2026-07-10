/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { Calendar, Clock, Video, MapPin, Loader, Check, AlertCircle, ChevronLeft, ChevronRight, CalendarDays, ArrowLeft, Heart, Star, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { BookingAvailability, BookingType, BookingTier } from "@/types/booking";
import { logError } from "@/lib/logger";
import { createBooking } from "@/lib/bookingsService";
import { formatCurrency } from "@/types/currency";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function BookingPage({ username, creator }: { username: string; creator: any }) {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"tier-select" | "form" | "success" | "error">(
    creator?.bookingMode === "tiered" && (creator?.bookingTiers || []).filter((t: BookingTier) => t.active).length > 0
      ? "tier-select"
      : "form"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<BookingTier | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedType, setSelectedType] = useState<BookingType>("both");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDates, setCalendarDates] = useState<string[]>([]);

  const isTiered = creator?.bookingMode === "tiered";
  const activeTiers: BookingTier[] = (creator?.bookingTiers || []).filter((t: BookingTier) => t.active);

  useEffect(() => {
    if (!isTiered && creator?.bookingAvailability) {
      setAvailability(creator.bookingAvailability);
      generateCalendarDates(creator.bookingAvailability);
    }
  }, [creator, isTiered]);

  useEffect(() => {
    if (selectedTier) {
      setAvailability(selectedTier.availability);
      generateCalendarDates(selectedTier.availability);
      setSelectedDate("");
      setSelectedTime("");
      setSelectedType(selectedTier.availability.bookingType === "both" ? "both" : selectedTier.availability.bookingType);
    }
  }, [selectedTier]);

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const generateCalendarDates = (avail: BookingAvailability) => {
    if (!avail.daysOfWeek || avail.daysOfWeek.length === 0 || !avail.defaultSlots || avail.defaultSlots.length === 0) {
      setCalendarDates([]);
      return;
    }
    const dates: string[] = [];
    const startRaw = avail.startDate ? new Date(avail.startDate + "T00:00:00") : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startRaw.setHours(0, 0, 0, 0);
    const start = startRaw > today ? startRaw : today;
    const endDate = avail.endDate ? new Date(avail.endDate + "T23:59:59") : new Date(today);
    if (!avail.endDate) endDate.setMonth(endDate.getMonth() + 2);
    for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (avail.daysOfWeek.includes(d.getDay())) dates.push(d.toISOString().split("T")[0]);
    }
    setCalendarDates(dates);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) { toast.error("Please select a date and time"); return; }
    if (!name.trim() || !email.trim()) { toast.error("Please fill in your name and email"); return; }
    setSubmitting(true);
    try {
      const data = await createBooking({
        creatorHandle: creator?.handle || username,
        bookerId: user?.uid || null,
        bookerName: name,
        bookerEmail: email,
        bookerPhone: phone,
        reason,
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        preferredType: selectedType,
        tierId: selectedTier?.id || null,
        tierName: selectedTier?.name || null,
        paymentAmount: selectedTier?.price || 0,
        currency: selectedTier?.currency || "RWF",
      });

      if (data?.paymentRequired && data?.bookingId) {
        router.push(`/booking/pay/${data.bookingId}`);
      } else {
        setStep("success");
      }
    } catch (err) {
      toast.error("Something went wrong"); setStep("error");
      logError("payment", "BookingPage: Failed to submit booking", {
        userName: user?.displayName || name,
        userEmail: user?.email || email,
        creatorHandle: creator?.handle || username,
        creatorId: creator?.uid,
        metadata: { creatorName: creator?.name, preferredDate: selectedDate, preferredTime: selectedTime, tierName: selectedTier?.name, tierPrice: selectedTier?.price, error: String(err) },
      });
    }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${creator?.handle || username}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Profile</span>
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition">
            <Heart size={18} className="fill-current" />
            Support
          </button>
        </div>

        {step === "tier-select" && isTiered && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="bg-foreground p-6 text-background">
                <h1 className="text-2xl font-bold">Choose a Tier</h1>
                <p className="text-muted-foreground text-sm mt-1">Select a meeting package with {creator?.name || username}</p>
              </div>
              <div className="p-6">
                {activeTiers.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="mx-auto text-muted-foreground mb-3" size={48} />
                    <p className="text-muted-foreground font-medium">No tiers available yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back later or contact them directly.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeTiers.map((tier) => (
                      <button key={tier.id} onClick={() => { setSelectedTier(tier); setStep("form"); }}
                        className="text-left bg-muted hover:bg-border-strong rounded-xl p-5 transition-all border-2 border-transparent hover:border-orange-500/50 group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold">{tier.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{tier.description}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xl font-black text-orange-600">
                              {tier.price > 0 ? formatCurrency(tier.price, tier.currency || "RWF") : "Free"}
                            </p>
                            <p className="text-xs text-muted-foreground">{tier.duration} minutes</p>
                          </div>
                        </div>
                        {tier.offers.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {tier.offers.filter(o => o.trim()).map((offer, i) => (
                              <p key={i} className="text-sm flex items-center gap-2 text-foreground">
                                <Star size={14} className="text-orange-500 shrink-0" /> {offer}
                              </p>
                            ))}
                          </div>
                        )}
                        {tier.purpose && (
                          <p className="text-xs text-muted-foreground italic border-t border-border pt-3 mt-1">
                            {tier.purpose}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-orange-600 font-bold text-sm group-hover:underline">
                          Select <ArrowRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="bg-foreground p-6 text-background">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Book a Meeting</h1>
                  <p className="text-muted-foreground text-sm mt-1">with {creator?.name || username}</p>
                </div>
                {isTiered && selectedTier && (
                  <div className="text-right">
                    <p className="text-sm font-bold">{selectedTier.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedTier.price > 0 ? formatCurrency(selectedTier.price, selectedTier.currency || "RWF") : "Free"} &middot; {selectedTier.duration}min</p>
                  </div>
                )}
              </div>
              {isTiered && (
                <button onClick={() => { setSelectedTier(null); setStep("tier-select"); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline mt-2">
                  Change tier
                </button>
              )}
            </div>
            <div className="p-6 space-y-5">
              {!availability || availability.daysOfWeek.length === 0 || availability.defaultSlots.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="mx-auto text-muted-foreground mb-3" size={48} />
                  <p className="text-muted-foreground font-medium">Availability not set up yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back later or contact them directly.</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => {
                        const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                        setCurrentMonth(prev);
                      }} disabled={currentMonth <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 transition">
                        <ChevronLeft size={18} className="text-muted-foreground" />
                      </button>
                      <h3 className="font-bold text-foreground">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        className="p-2 hover:bg-muted rounded-lg transition">
                        <ChevronRight size={18} className="text-muted-foreground" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_OF_WEEK.map(d => <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                        const nodes: React.ReactNode[] = [];
                        for (let i = 0; i < firstDay; i++) nodes.push(<div key={`e-${i}`} />);
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isAvailable = calendarDates.includes(dateStr);
                          nodes.push(
                            <button key={dateStr} onClick={() => isAvailable && setSelectedDate(dateStr)} disabled={!isAvailable}
                              className={`p-2 rounded-lg text-center text-sm transition-all ${selectedDate === dateStr ? "bg-orange-500 text-white font-bold" : isAvailable ? "bg-muted text-foreground hover:bg-border-strong" : "text-muted-foreground cursor-not-allowed"}`}>
                              {d}
                            </button>
                          );
                        }
                        return nodes;
                      })()}
                    </div>
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Select Time</label>
                      <div className="flex flex-wrap gap-2">
                        {availability.defaultSlots.map(slot => (
                          <button key={slot.id} onClick={() => setSelectedTime(`${slot.startTime} - ${slot.endTime}`)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTime === `${slot.startTime} - ${slot.endTime}` ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>
                            {slot.startTime} - {slot.endTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate && selectedTime && availability.bookingType === "both" && (
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Meeting Type</label>
                      <div className="flex gap-3">
                        <button onClick={() => setSelectedType("online")}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedType === "online" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>
                          <Video size={16} /> Online
                        </button>
                        <button onClick={() => setSelectedType("physical")}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedType === "physical" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-border-strong"}`}>
                          <MapPin size={16} /> In Person
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Your Information</label>
                    <div className="space-y-2">
                      <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all" />
                      <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all" />
                      <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Reason for Meeting (optional)</label>
                    <textarea placeholder="Briefly describe what you'd like to discuss..." value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all resize-none" />
                  </div>

                  <button onClick={handleSubmit} disabled={submitting || !selectedDate || !selectedTime}
                    className="w-full bg-foreground text-background py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50">
                    {submitting ? <Loader className="animate-spin" size={18} /> : <Calendar size={18} />}
                    {selectedTier?.price && selectedTier.price > 0 ? `Continue to Payment — ${formatCurrency(selectedTier.price, selectedTier.currency || "RWF")}` : "Submit Request"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {selectedTier?.price && selectedTier.price > 0 ? "Proceed to Payment" : "Request Sent!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {selectedTier?.price && selectedTier.price > 0
                ? "Your booking request is pending payment. Complete payment to confirm your booking."
                : `Your booking request has been sent to ${creator?.name || username}. You'll receive an email once they respond.`}
            </p>
            <Link href={`/${creator?.handle || username}`}
              className="bg-foreground text-background px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all inline-block">
              Back to Profile
            </Link>
          </div>
        )}

        {step === "error" && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">We couldn't submit your booking request. Please try again.</p>
            <button onClick={() => setStep("form")}
              className="bg-foreground text-background px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all">
              Try Again
            </button>
          </div>
        )}
      </div>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creator?.name || username}
        creatorId={creator?.handle || username}
        uid={creator?.uid || ""}
        includeReferral={false}
      />
    </>
  );
}
