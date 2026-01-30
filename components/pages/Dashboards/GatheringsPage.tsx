"use client";

import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  ChevronRight,
  Share2,
  QrCode,
  Loader2,
  X,
} from "lucide-react";

export default function GatheringsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const [events, setEvents] = useState([
    {
      id: "0",
      title: "Kigali Street Art Walk",
      date: "Feb 12, 2026",
      time: "10:00 AM",
      location: "Kacyiru, Kigali",
      price: "5,000",
      attendees: [
        { name: "Innocent K.", status: "Paid" },
        { name: "Marie-Rose U.", status: "Paid" },
        { name: "David B.", status: "Pending" },
      ],
      status: "Upcoming",
      capacity: 15,
    },
    {
      id: "1",
      title: "Digital Creators Meetup",
      date: "Feb 28, 2026",
      time: "6:00 PM",
      location: "Norrsken House",
      price: "Free",
      attendees: [{ name: "Alice G.", status: "Paid" }],
      status: "Upcoming",
      capacity: 50,
    },
  ]);

  const activeEvent = events[selectedEvent];

  const handleCreate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setIsCreating(false);
      // Logic to add event would go here
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans text-slate-900">
      {/* --- Sidebar Nav --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-black mb-6">Gatherings</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg shadow-orange-100 mb-8"
        >
          <Plus size={18} /> Plan Event
        </button>
      </aside>

      <main className="flex-1 flex flex-col md:flex-row">
        {/* --- Left Column: Event List --- */}
        <div className="flex-1 p-8 border-r border-slate-100 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Scheduled
            </h3>
            <span className="text-xs font-bold text-orange-600">
              {events.length} Active
            </span>
          </div>

          <div className="space-y-4">
            {events.map((event, index) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(index)}
                className={`w-full text-left p-6 rounded-[2rem] border transition-all ${
                  selectedEvent === index
                    ? "bg-white border-orange-500 shadow-xl shadow-slate-200/50 scale-[1.02]"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-900">
                    <Calendar size={20} />
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-1 rounded uppercase ${event.status === "Upcoming" ? "bg-green-50 text-green-600" : "bg-slate-100"}`}
                  >
                    {event.status}
                  </span>
                </div>
                <h4 className="text-xl font-black mb-1">{event.title}</h4>
                <p className="text-sm text-slate-500 flex items-center gap-2 mb-4">
                  <MapPin size={14} className="text-slate-300" />{" "}
                  {event.location}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Users size={14} /> {event.attendees.length}/
                    {event.capacity} Joined
                  </div>
                  <ChevronRight
                    size={16}
                    className={
                      selectedEvent === index
                        ? "text-orange-500"
                        : "text-slate-300"
                    }
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* --- Right Column: Event Detail & Management --- */}
        <div className="w-full md:w-96 bg-white p-8 overflow-y-auto hidden lg:block">
          {activeEvent && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-lg">Event Details</h3>
                <div className="flex gap-2">
                  <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition">
                    <Share2 size={18} />
                  </button>
                  <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">
                    Total Earnings
                  </p>
                  <h2 className="text-3xl font-black text-orange-900">
                    {(
                      activeEvent.attendees.filter((a) => a.status === "Paid")
                        .length *
                        parseInt(activeEvent.price.replace(",", "")) || 0
                    ).toLocaleString()}
                    <span className="text-xs font-normal ml-1">RWF</span>
                  </h2>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-black uppercase text-slate-400 tracking-widest">
                    Guest List
                  </h5>
                  <div className="space-y-2">
                    {activeEvent.attendees.map((guest, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold">
                            {guest.name[0]}
                          </div>
                          <span className="text-sm font-bold">
                            {guest.name}
                          </span>
                        </div>
                        <CheckCircle2
                          size={16}
                          className={
                            guest.status === "Paid"
                              ? "text-green-500"
                              : "text-slate-200"
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 transition">
                  <QrCode size={20} /> Check-in Guests
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- Create Event Modal --- */}
        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Plan a Gathering</h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="Gathering Title"
                  className="w-full text-xl font-bold outline-none border-b border-slate-100 pb-2 focus:border-orange-500 transition placeholder:text-slate-200"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Ticket Price (RWF)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-slate-50 p-3 rounded-xl text-sm outline-none font-bold"
                  />
                  <p className="text-[10px] text-slate-400">
                    Set to 0 for free events
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
                >
                  {isSimulating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Publish Gathering"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
