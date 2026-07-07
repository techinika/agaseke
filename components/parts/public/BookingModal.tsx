/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { Calendar, Clock, Video, MapPin, Loader, X, Check, AlertCircle, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Creator } from "@/types/creator";
import { BookingAvailability, BookingType } from "@/types/booking";
import { logError } from "@/lib/logger";
import { createBooking } from "@/lib/bookingsService";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function BookingModal({
  isOpen,
  onClose,
  creator,
}: {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "success" | "error">("form");
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
    if (creator.bookingAvailability) {
      setAvailability(creator.bookingAvailability);
      generateCalendarDates(creator.bookingAvailability);
    } else {
      setAvailability(null);
      setCalendarDates([]);
    }
  }, [creator]);

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
      if (avail.daysOfWeek.includes(d.getDay())) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }
    setCalendarDates(dates);
  };

  const getMonthDates = () => {
    if (!calendarDates.length) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return calendarDates.filter(date => {
      const d = new Date(date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        creatorHandle: creator.handle,
        bookerId: user?.uid || null,
        bookerName: name,
        bookerEmail: email,
        bookerPhone: phone,
        reason,
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        preferredType: selectedType,
      });

      setStep("success");
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Something went wrong. Please try again.");
      setStep("error");
      logError("payment", "BookingModal: Failed to submit booking", {
        userName: user?.displayName || name,
        userEmail: user?.email || email,
        creatorHandle: creator?.handle,
        creatorId: creator?.uid,
        metadata: { creatorName: creator?.name, preferredDate: selectedDate, preferredTime: selectedTime, error: String(error) },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const canGoPrev = () => {
    const today = new Date();
    return currentMonth.getFullYear() > today.getFullYear() || 
           (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() > today.getMonth());
  };

  const monthDates = getMonthDates();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X size={20} />
        </button>

        {step === "form" && (
          <>
            <div className="bg-foreground p-6 text-background rounded-t-xl">
              <h2 className="text-xl font-bold">Book a Meeting</h2>
              <p className="text-muted-foreground text-sm mt-1">with {creator.name}</p>
            </div>

            <div className="p-6 space-y-5">
              {!availability || availability.daysOfWeek.length === 0 || availability.defaultSlots.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="mx-auto text-muted-foreground mb-3" size={40} />
                  <p className="text-muted-foreground font-medium">Availability not set up yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back later or contact {creator.name} directly.</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={prevMonth}
                        disabled={!canGoPrev()}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={18} className="text-muted-foreground" />
                      </button>
                      <h3 className="font-bold text-foreground">
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-muted rounded-lg transition"
                      >
                        <ChevronRight size={18} className="text-muted-foreground" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                        const days: React.ReactNode[] = [];
                        
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} />);
                        }
                        
                        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isAvailable = calendarDates.includes(dateStr);
                          
                          days.push(
                            <button
                              key={dateStr}
                              onClick={() => isAvailable && setSelectedDate(dateStr)}
                              disabled={!isAvailable}
                              className={`p-2 rounded-lg text-center text-sm transition-all ${
                                selectedDate === dateStr
                                  ? "bg-orange-500 text-white font-bold"
                                  : isAvailable
                                  ? "bg-muted text-foreground hover:bg-muted"
                                  : "text-muted-foreground cursor-not-allowed"
                              }`}
                            >
                              {d}
                            </button>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Select Time</label>
                      <div className="flex flex-wrap gap-2">
                        {availability.defaultSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedTime(`${slot.startTime} - ${slot.endTime}`)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedTime === `${slot.startTime} - ${slot.endTime}`
                                ? "bg-orange-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted"
                            }`}
                          >
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
                        <button
                          onClick={() => setSelectedType("online")}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            selectedType === "online"
                              ? "bg-orange-500 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Video size={16} />
                          Online
                        </button>
                        <button
                          onClick={() => setSelectedType("physical")}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            selectedType === "physical"
                              ? "bg-orange-500 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <MapPin size={16} />
                          In Person
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Your Information</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Reason for Meeting (optional)</label>
                <textarea
                  placeholder="Briefly describe what you'd like to discuss..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full bg-muted p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-card transition-all resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedDate || !selectedTime || !availability || availability.daysOfWeek.length === 0}
                className="w-full bg-foreground text-background py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <Calendar size={18} />
                )}
                Submit Request
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-500" size={28} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Request Sent!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your booking request has been sent to {creator.name}. You'll receive an email once they respond.
            </p>
            <button
              onClick={onClose}
              className="bg-foreground text-background px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-500" size={28} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-6">
              We couldn't submit your booking request. Please try again.
            </p>
            <button
              onClick={() => setStep("form")}
              className="bg-foreground text-background px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
