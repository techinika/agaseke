/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { Calendar, Clock, Video, MapPin, Loader, Check, AlertCircle, ChevronLeft, ChevronRight, CalendarDays, ArrowLeft, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { BookingAvailability, BookingType } from "@/types/booking";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function BookingPage({ username, creator }: { username: string; creator: any }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "success" | "error">("form");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (creator?.bookingAvailability) {
      setAvailability(creator.bookingAvailability);
      generateCalendarDates(creator.bookingAvailability);
    }
  }, [creator]);

  const generateCalendarDates = (avail: BookingAvailability) => {
    if (!avail.daysOfWeek || avail.daysOfWeek.length === 0 || !avail.defaultSlots || avail.defaultSlots.length === 0) {
      setCalendarDates([]);
      return;
    }
    const dates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = avail.endDate ? new Date(avail.endDate) : new Date(today);
    endDate.setMonth(endDate.getMonth() + 2);
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (avail.daysOfWeek.includes(d.getDay())) dates.push(d.toISOString().split("T")[0]);
    }
    setCalendarDates(dates);
  };

  const monthDates = calendarDates.filter(date => {
    const d = new Date(date);
    return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
  });

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) { toast.error("Please select a date and time"); return; }
    if (!name.trim() || !email.trim()) { toast.error("Please fill in your name and email"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorHandle: username,
          bookerId: user?.uid || null,
          bookerName: name,
          bookerEmail: email,
          bookerPhone: phone,
          reason,
          preferredDate: selectedDate,
          preferredTime: selectedTime,
          preferredType: selectedType,
        }),
      });
      if (res.ok) setStep("success");
      else { toast.error("Failed to submit booking"); setStep("error"); }
    } catch { toast.error("Something went wrong"); setStep("error"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Profile</span>
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition">
            <Heart size={18} className="fill-current" />
            Gift Once
          </button>
        </div>

        {step === "form" && (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="bg-foreground p-6 text-background">
              <h1 className="text-2xl font-bold">Book a Meeting</h1>
              <p className="text-muted-foreground text-sm mt-1">with {creator?.name || username}</p>
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
                    Submit Request
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Request Sent!</h2>
            <p className="text-muted-foreground mb-6">Your booking request has been sent to {creator?.name || username}. You'll receive an email once they respond.</p>
            <Link href={`/${username}`}
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
      <Footer />

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creator?.name || username}
        creatorId={username}
        uid={creator?.uid || ""}
        includeReferral={false}
      />
    </div>
  );
}
