"use client";

import React, { useState } from "react";
import { db } from "@/db/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowLeft,
  Send,
  Users,
  UserCheck,
  ShieldCheck,
  Loader,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";

export default function AdminComms() {
  const [target, setTarget] = useState<
    "all" | "creators" | "verified" | "not-verified"
  >("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return toast.error("Please fill all fields");

    setSending(true);
    try {
      let emails: string[] = [];

      if (target === "all") {
        const snap = await getDocs(collection(db, "profiles"));
        emails = snap.docs.map((doc) => doc.data().email).filter(Boolean);
      } else {
        let creatorQuery;
        if (target === "verified") {
          creatorQuery = query(
            collection(db, "creators"),
            where("verified", "==", true),
          );
        } else if (target === "not-verified") {
          creatorQuery = query(
            collection(db, "creators"),
            where("verified", "==", false),
          );
        } else {
          creatorQuery = collection(db, "creators");
        }

        const creatorSnap = await getDocs(creatorQuery);
        const creatorUids = creatorSnap.docs.map((doc) => doc.data().uid);

        if (creatorUids.length === 0) {
          toast.error("No creators found in this category");
          setSending(false);
          return;
        }

        const profileSnap = await getDocs(collection(db, "profiles"));
        emails = profileSnap.docs
          .filter((doc) => creatorUids.includes(doc.id))
          .map((doc) => doc.data().email)
          .filter(Boolean);
      }

      if (emails.length === 0) {
        toast.error("No emails found for the selected recipients");
        return;
      }

      const res = await fetch("/api/comms/email/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          subject,
          message,
          targetLabel: target.toUpperCase(),
        }),
      });

      if (res.ok) {
        toast.success(`Broadcast sent to ${emails.length} recipients!`);
        setSubject("");
        setMessage("");
      } else {
        throw new Error("Failed to send broadcast");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error sending broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 mt-12">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight uppercase">
            Comms Center
          </h1>
          <p className="text-slate-500 font-medium">
            Send newsletters or updates to your community.
          </p>
        </header>

        <form
          onSubmit={handleSend}
          className="bg-white border border-slate-100 rounded-lg p-8 shadow-sm space-y-8 my-5"
        >
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">
              Select Audience
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "all", label: "All Users", icon: <Users size={18} /> },
                {
                  id: "creators",
                  label: "Creators",
                  icon: <UserCheck size={18} />,
                },
                {
                  id: "verified",
                  label: "Verified Only",
                  icon: <ShieldCheck size={18} />,
                },
                {
                  id: "not-verified",
                  label: "Unverified Only",
                  icon: <ShieldAlert size={18} />,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTarget(item.id as any)}
                  className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all font-bold text-sm ${
                    target === item.id
                      ? "border-orange-600 bg-orange-50 text-orange-600 shadow-inner"
                      : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Platform Update: New Features for Creators!"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-4 text-sm focus:border-orange-500 outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Message Body (HTML Supported)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-lg p-6 text-sm focus:border-orange-500 outline-none transition-all resize-none leading-relaxed"
              />
            </div>
          </div>

          <button
            disabled={sending}
            className="w-full bg-slate-900 text-white py-5 rounded-lg font-black text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {sending ? <Loader className="animate-spin" /> : <Send size={20} />}
            {sending ? "Sending Broadcast..." : "Launch Broadcast"}
          </button>
        </form>
      </main>
    </div>
  );
}
