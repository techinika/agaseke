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
  Info,
  Trash2,
} from "lucide-react";
import { db, auth } from "@/db/firebase";
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
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";

export default function GatheringsPage() {
  const { creator } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleCreate = async () => {
    if (!creator || !formData.title) return;

    setIsSimulating(true);
    try {
      await addDoc(collection(db, "creatorGatherings"), {
        creatorId: creator.uid,
        ...formData,
        attendeesCount: 0,
        status: "Upcoming",
        createdAt: serverTimestamp(),
      });
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
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) {
      await deleteDoc(doc(db, "creatorGatherings", isDeleting));
      setIsDeleting(null);
      setSelectedEventIndex(0);
    }
  };

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
              Scheduled
            </h3>
            <span className="text-xs font-bold text-orange-600">
              {events.length} Active
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              <Loader className="animate-spin mx-auto text-slate-300" />
            ) : (
              events.map((event, index) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventIndex(index)}
                  className={`w-full text-left p-6 rounded-lg border transition-all ${
                    selectedEventIndex === index
                      ? "bg-white border-orange-500 shadow-xl scale-[1.01]"
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
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase bg-green-50 text-green-600">
                      {event.status}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-1">{event.title}</h4>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-slate-300" />{" "}
                    {event.location}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="text-xs font-bold text-slate-400">
                      {event.attendeesCount || 0} supporters willing to attend
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
                <h3 className="font-bold text-lg">Management</h3>
                <button
                  onClick={() => setIsDeleting(activeEvent.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-lg text-white">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Entry Requirement
                  </p>
                  <h2 className="text-xl font-bold">
                    {activeEvent.minSupportTier > 0
                      ? `Min. Support: ${activeEvent.minSupportTier} RWF`
                      : "Open to Everyone"}
                  </h2>
                </div>

                <div className="p-6 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-2 mb-4 text-orange-600">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase">
                      Supporter Note
                    </span>
                  </div>
                  <p className="text-sm text-orange-800 font-medium leading-relaxed">
                    This gathering is free for your supporters. We are currently
                    tracking how many people are interested in joining.
                  </p>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-bold hover:border-orange-500 hover:text-orange-500 transition">
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
                  Plan Gathering
                </h2>
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
                  className="w-full text-xl font-bold outline-none border-b-2 border-slate-50 pb-2 focus:border-orange-500 transition placeholder:text-slate-200"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Location (Physical or Digital link)"
                  className="w-full text-sm font-bold outline-none border-b border-slate-50 pb-2 focus:border-orange-500 transition"
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    className="bg-slate-50 p-4 rounded-lg text-sm outline-none font-bold"
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                  <input
                    type="time"
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

                <button
                  onClick={handleCreate}
                  disabled={!formData.title || isSimulating}
                  className="w-full bg-slate-900 text-white py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulating ? (
                    <Loader className="animate-spin" />
                  ) : (
                    "Publish Gathering"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Delete Confirmation Modal --- */}
        {isDeleting && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-lg p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Cancel Gathering?</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">
                This will remove the event for all supporters. This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleting(null)}
                  className="flex-1 py-4 rounded-lg font-bold text-slate-400 hover:bg-slate-50 transition"
                >
                  Keep it
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-4 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
