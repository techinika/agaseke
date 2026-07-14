/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import { useRouter } from "next/navigation";
import { Loader, ArrowLeft, Globe, Users, ShieldCheck, Ticket, X } from "lucide-react";
import { db } from "@/db/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";
import type { EventType } from "@/components/parts/public/gatherings/types";
import { formatCurrency } from "@/types/currency";

interface GatheringsFormProps {
  gatheringId?: string;
}

export default function GatheringsForm({ gatheringId }: GatheringsFormProps) {
  const { creator } = useAuth();
  const router = useRouter();
  const isEditing = !!gatheringId;
  const defaultCurrency = (creator?.currency as "RWF" | "USD") || "RWF";
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const eventTypeOptions: { value: EventType; icon: React.ReactNode; title: string; desc: string }[] = [
    { value: "public", icon: <Globe size={24} />, title: "Public", desc: "Everyone can see and RSVP for free" },
    { value: "supporters", icon: <Users size={24} />, title: "Supporters", desc: "Only supporters can see and RSVP for free" },
    { value: "supporters_tiered", icon: <ShieldCheck size={24} />, title: "Tiered", desc: "Supporters with a minimum contribution can RSVP" },
    { value: "ticketed", icon: <Ticket size={24} />, title: "Ticketed", desc: "Anyone can purchase a ticket to attend" },
  ];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    eventType: "public" as EventType,
    minSupportTier: 0,
    ticketPrice: 0,
    priceUSD: 0,
    currency: defaultCurrency,
    supporterPrice: 0,
    capacity: 20,
    active: true,
  });

  useEffect(() => {
    if (!gatheringId || !creator?.uid) return;
    const fetchEvent = async () => {
      try {
        const snap = await getDoc(doc(db, "creatorGatherings", gatheringId));
        if (!snap.exists()) {
          toast.error("Event not found");
          router.push("/creator/gatherings");
          return;
        }
        const data = snap.data();
        setFormData({
          title: data.title || "",
          description: data.description || "",
          date: data.date || "",
          time: data.time || "",
          location: data.location || "",
          eventType: data.eventType || guessEventType(data),
          minSupportTier: data.minSupportTier || 0,
          ticketPrice: data.ticketPrice || 0,
          priceUSD: data.priceUSD || 0,
          currency: data.currency || "RWF",
          supporterPrice: data.supporterPrice || 0,
          capacity: data.capacity || 0,
          active: data.status === "Upcoming",
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to load event");
        router.push("/creator/gatherings");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [gatheringId, creator, router]);

  const guessEventType = (data: any): EventType => {
    if (data.eventType) return data.eventType;
    if (data.ticketPrice > 0) return "ticketed";
    if (data.minSupportTier > 0) return "supporters_tiered";
    return "public";
  };

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.title) { toast.error("Title is required"); return; }
    if (!formData.date) { toast.error("Date is required"); return; }
    if (!formData.time) { toast.error("Time is required"); return; }

    setSaving(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        eventType: formData.eventType,
        minSupportTier: formData.eventType === "supporters_tiered" ? formData.minSupportTier : 0,
        ticketPrice: formData.eventType === "ticketed" ? formData.ticketPrice : 0,
        priceUSD: formData.eventType === "ticketed" && formData.currency === "USD" ? formData.priceUSD : 0,
        currency: formData.eventType === "ticketed" ? formData.currency : "RWF",
        supporterPrice: formData.eventType === "ticketed" ? formData.supporterPrice : 0,
        capacity: formData.capacity || 0,
        creatorId: creator.uid,
        status: formData.active ? "Upcoming" : "Disabled",
      };

      if (isEditing) {
        await updateDoc(doc(db, "creatorGatherings", gatheringId), eventData);
        toast.success("Event updated!");
        console.log(`[GATHERING_FORM] Updated gathering "${formData.title}" (${gatheringId})`);
      logActivity({
          level: "info",
          category: "gathering",
          message: `Gathering updated: "${formData.title}"`,
          creatorId: creator.uid,
          metadata: { gatheringId },
        });
      } else {
        const docRef = await addDoc(collection(db, "creatorGatherings"), {
          ...eventData,
          attendeesCount: 0,
          createdAt: serverTimestamp(),
        });
        toast.success("Event created!");
        console.log(`[GATHERING_FORM] Created gathering "${formData.title}" (${docRef.id})`);
        logActivity({
          level: "info",
          category: "gathering",
          message: `Gathering created: "${formData.title}"`,
          creatorId: creator.uid,
          metadata: { gatheringId: docRef.id },
        });
        sendCommsEmail("gathering_created", {
          creatorId: creator.uid,
          creatorName: creator.name,
          creatorHandle: creator.handle,
          gatheringId: docRef.id,
          gatheringTitle: formData.title,
          gatheringDate: formData.date,
          gatheringTime: formData.time,
          gatheringLocation: formData.location,
          gatheringDescription: formData.description,
        }).catch((err) => { console.error("Failed to send gathering created email", err); });
      }

      router.push("/creator/gatherings");
    } catch (e) {
      console.error(e);
      console.error(`[GATHERING_FORM] Failed to ${isEditing ? "update" : "create"} event:`, e);
      logActivity({
        level: "error",
        category: "gathering",
        message: `Gathering: Failed to ${isEditing ? "update" : "create"} event`,
        creatorId: creator?.uid,
        metadata: { errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
      });
      toast.error(`Failed to ${isEditing ? "update" : "create"} event`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/creator/gatherings")}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {isEditing ? "Edit Event" : "New Event"}
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Event Title</label>
            <input
              type="text"
              placeholder="e.g. Summer Music Festival"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xl font-bold outline-none border-b-2 border-border pb-2 focus:border-orange-500 transition placeholder:text-muted-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Description (optional)</label>
            <textarea
              placeholder="Describe your event..."
              value={formData.description}
              rows={3}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-sm outline-none border-b border-border pb-2 focus:border-orange-500 transition placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-3 block">Event Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, eventType: opt.value })}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition ${
                    formData.eventType === opt.value
                      ? "border-orange-500 bg-orange-50"
                      : "border-border hover:border-orange-200"
                  }`}
                >
                  <span className={`p-2 rounded-lg ${formData.eventType === opt.value ? "text-orange-600" : "text-muted-foreground"}`}>
                    {opt.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${formData.eventType === opt.value ? "text-orange-700" : "text-foreground"}`}>
                      {opt.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional fields based on event type */}
          {formData.eventType === "supporters_tiered" && (
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Minimum Support Amount (RWF)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={formData.minSupportTier || ""}
                onChange={(e) => setFormData({ ...formData, minSupportTier: parseInt(e.target.value) || 0 })}
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Only supporters who have contributed this amount or more can RSVP.
              </p>
            </div>
          )}

          {formData.eventType === "ticketed" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                  Currency
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: "RWF" })}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                      formData.currency === "RWF"
                        ? "bg-orange-600 text-white"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    RWF
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: "USD" })}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                      formData.currency === "USD"
                        ? "bg-orange-600 text-white"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                  Ticket Price ({formData.currency === "USD" ? "USD" : "RWF"})
                </label>
                <input
                  type="number"
                  placeholder={formData.currency === "USD" ? "e.g. 10" : "e.g. 10000"}
                  value={formData.currency === "USD" ? (formData.priceUSD || "") : (formData.ticketPrice || "")}
                  onChange={(e) => setFormData({
                    ...formData,
                    ...(formData.currency === "USD"
                      ? { priceUSD: parseInt(e.target.value) || 0 }
                      : { ticketPrice: parseInt(e.target.value) || 0 }
                    ),
                  })}
                  className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                />
              </div>
              {formData.currency !== defaultCurrency && (
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                    Ticket Price ({defaultCurrency})
                  </label>
                  <input
                    type="number"
                    value={formData.currency === "USD" ? (formData.ticketPrice || "") : (formData.priceUSD || "")}
                    onChange={(e) => setFormData({
                      ...formData,
                      ...(formData.currency === "USD"
                        ? { ticketPrice: parseInt(e.target.value) || 0 }
                        : { priceUSD: parseInt(e.target.value) || 0 }),
                    })}
                    placeholder={`${defaultCurrency} equivalent`}
                    className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {defaultCurrency} equivalent for local mobile money payments
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                  Supporter Discount ({formData.currency === "USD" ? "USD" : "RWF"}) <span className="text-orange-500">optional</span>
                </label>
                <input
                  type="number"
                  placeholder="Leave empty for no discount"
                  value={formData.supporterPrice || ""}
                  onChange={(e) => setFormData({ ...formData, supporterPrice: parseInt(e.target.value) || 0 })}
                  className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Supporters pay this discounted price instead of the full ticket price.
                </p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Location</label>
            <input
              type="text"
              placeholder="Physical address or digital meeting link"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Capacity (optional)</label>
            <input
              type="number"
              placeholder="Max attendees (0 for unlimited)"
              value={formData.capacity || ""}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none font-bold focus:ring-2 focus:ring-orange-100"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Set a limit on how many people can attend.
            </p>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <p className="font-bold text-sm">Publish Event</p>
              <p className="text-xs text-muted-foreground">
                {formData.active ? "Visible to eligible attendees" : "Hidden from everyone"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`w-12 h-6 rounded-full transition-colors ${formData.active ? "bg-green-500" : "bg-muted"}`}
            >
              <div className={`w-5 h-5 bg-card rounded-full shadow transition-transform ${formData.active ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/gatherings")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.title || !formData.date || !formData.time}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
