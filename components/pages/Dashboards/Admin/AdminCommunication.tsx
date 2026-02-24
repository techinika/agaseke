"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  ArrowLeft,
  Send,
  Users,
  UserCheck,
  ShieldCheck,
  Loader,
  ShieldAlert,
  History,
  Eye,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminComms() {
  const [target, setTarget] = useState<
    "all" | "creators" | "verified" | "not-verified"
  >("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);

  // 1. Fetch Broadcast History via Realtime Listener
  useEffect(() => {
    const q = query(
      collection(db, "adminBroadcasts"),
      orderBy("sentAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const historyData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHistory(historyData);
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return toast.error("Please fill all fields");

    setSending(true);
    try {
      let recipients: any[] = [];

      const profilesSnap = await getDocs(collection(db, "profiles"));
      const profilesMap = new Map();
      profilesSnap.forEach((d) => profilesMap.set(d.id, d.data()));

      if (target === "all") {
        recipients = Array.from(profilesMap.values())
          .map((p) => ({
            email: p.email,
            name: p.displayName,
            handle: p.username,
          }))
          .filter((r) => r.email);
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

        const cSnap = await getDocs(creatorQuery);
        recipients = cSnap.docs
          .map((doc) => {
            const profile = profilesMap.get(doc.data().uid);
            return profile
              ? {
                  email: profile.email,
                  name: profile.displayName,
                  handle: profile.username,
                }
              : null;
          })
          .filter(Boolean);
      }

      if (recipients.length === 0) {
        setSending(false);
        return toast.error("No recipients found in this category.");
      }

      const res = await fetch("/api/comms/email/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          message,
          targetLabel: target.toUpperCase(),
        }),
      });

      if (res.ok) {
        toast.success(`Success! Broadcast sent to ${recipients.length} users.`);
        setSubject("");
        setMessage("");
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error launching broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Comms Center
            </h1>
            <p className="text-slate-500 font-medium">
              Draft and dispatch platform-wide announcements.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-2xl border border-blue-100">
            <Info size={18} />
            <p className="text-xs font-bold uppercase tracking-tight">
              Tip: Use [NAME] or [HANDLE] to personalize
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* COMPOSER FORM (Left) */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSend}
              className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-10"
            >
              {/* Audience Filters */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">
                  1. Target Audience
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      id: "all",
                      label: "All Users",
                      icon: <Users size={18} />,
                    },
                    {
                      id: "creators",
                      label: "Creators",
                      icon: <UserCheck size={18} />,
                    },
                    {
                      id: "verified",
                      label: "Verified",
                      icon: <ShieldCheck size={18} />,
                    },
                    {
                      id: "not-verified",
                      label: "Unverified",
                      icon: <ShieldAlert size={18} />,
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTarget(item.id as any)}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-xs ${
                        target === item.id
                          ? "border-orange-600 bg-orange-50 text-orange-600 shadow-sm"
                          : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Inputs */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                    2. Email Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Big updates for [NAME]!"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm focus:border-orange-500 outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                    3. Message Content (HTML Supported)
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hello [NAME], we have news regarding your handle @[HANDLE]..."
                    className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-xl p-6 text-sm focus:border-orange-500 outline-none transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              <button
                disabled={sending}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {sending ? (
                  <Loader className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
                {sending ? "Processing Batch..." : "Launch Broadcast"}
              </button>
            </form>
          </div>

          {/* HISTORY SIDEBAR (Right) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-2 text-slate-900 px-2">
              <History size={20} className="text-orange-600" />
              <h2 className="font-black uppercase tracking-widest text-sm">
                Recent Broadcasts
              </h2>
            </div>

            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 no-scrollbar">
              {history.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 p-10 rounded-3xl text-center">
                  <p className="text-slate-400 text-sm font-medium">
                    No logs found.
                  </p>
                </div>
              ) : (
                history.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`text-[9px] font-black tracking-tighter px-2 py-0.5 rounded-full ${
                          log.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.targetLabel || "GENERAL"}
                      </span>
                      <button
                        onClick={() => setPreview(log)}
                        className="text-slate-300 hover:text-orange-600 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 truncate mb-1 pr-6">
                      {log.subject}
                    </h3>
                    <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {log.sentAt?.toDate().toLocaleDateString("en-GB")}
                      </p>
                      <p className="text-[10px] font-black text-slate-900">
                        {log.sentCount}{" "}
                        <span className="text-slate-400">USERS</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* PREVIEW MODAL */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl scale-in-center overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Broadcast Archive
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  Sent to {preview.sentCount} recipients
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                  Subject
                </label>
                <p className="font-bold text-slate-900">{preview.subject}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-4">
                  Message Body
                </label>
                <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed font-medium">
                  {preview.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
