/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from "@/auth/AuthContext";
import { Calendar, Clock, Video, MapPin, Loader, X, Check, AlertCircle, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Creator } from "@/types/creator";
import { BookingAvailability, BookingType } from "@/types/booking";

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = avail.endDate ? new Date(avail.endDate) : new Date(today);
    endDate.setMonth(endDate.getMonth() + 2);

    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
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
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorHandle: creator.handle,
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

      const data = await response.json();
      if (response.ok) {
        setStep("success");
      } else {
        toast.error(data.error || "Failed to submit booking");
        setStep("error");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Something went wrong. Please try again.");
      setStep("error");
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {step === "form" && (
          <>
            <div className="bg-slate-900 p-6 text-white rounded-t-xl">
              <h2 className="text-xl font-bold">Book a Meeting</h2>
              <p className="text-slate-400 text-sm mt-1">with {creator.name}</p>
            </div>

            <div className="p-6 space-y-5">
              {!availability || availability.daysOfWeek.length === 0 || availability.defaultSlots.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500 font-medium">Availability not set up yet</p>
                  <p className="text-sm text-slate-400 mt-1">Check back later or contact {creator.name} directly.</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={prevMonth}
                        disabled={!canGoPrev()}
                        className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={18} className="text-slate-600" />
                      </button>
                      <h3 className="font-bold text-slate-900">
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                      >
                        <ChevronRight size={18} className="text-slate-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
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
                                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  : "text-slate-300 cursor-not-allowed"
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select Time</label>
                      <div className="flex flex-wrap gap-2">
                        {availability.defaultSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedTime(`${slot.startTime} - ${slot.endTime}`)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedTime === `${slot.startTime} - ${slot.endTime}`
                                ? "bg-orange-500 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Meeting Type</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedType("online")}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            selectedType === "online"
                              ? "bg-orange-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Your Information</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Meeting (optional)</label>
                <textarea
                  placeholder="Briefly describe what you'd like to discuss..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedDate || !selectedTime || !availability || availability.daysOfWeek.length === 0}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">Request Sent!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your booking request has been sent to {creator.name}. You'll receive an email once they respond.
            </p>
            <button
              onClick={onClose}
              className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-6">
              We couldn't submit your booking request. Please try again.
            </p>
            <button
              onClick={() => setStep("form")}
              className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
