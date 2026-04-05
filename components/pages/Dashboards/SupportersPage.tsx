/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  ArrowLeft,
  Loader,
  Mail,
  Send,
  Search,
  X,
  Filter,
  DollarSign,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Profile } from "@/types/profile";

interface SupporterSupport {
  id: string;
  supporterId: string | null;
  amount: number;
  createdAt: any;
  txRef: string;
  supporterPhoneNumber?: string;
}

interface AggregatedSupporter {
  supporterId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  totalAmount: number;
  supportCount: number;
  lastSupported: any;
}

export default function SupportersPage() {
  const { creator } = useAuth();
  const [supports, setSupports] = useState<SupporterSupport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAmount, setFilterAmount] = useState<"all" | "high" | "low">("all");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (!creator?.handle) return;

    const supportsRef = collection(db, "supportedCreators");
    const q = query(
      supportsRef,
      where("creatorId", "==", creator.handle),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const supportData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupporterSupport[];
      setSupports(supportData);
      setLoading(false);
    });

    return () => unsub();
  }, [creator?.handle]);

  const aggregatedSupporters = useMemo(() => {
    const grouped = new Map<string, AggregatedSupporter>();

    supports.forEach((support) => {
      const id = support.supporterId || "anonymous";
      const existing = grouped.get(id);

      if (existing) {
        existing.totalAmount += support.amount;
        existing.supportCount += 1;
        if (support.createdAt?.seconds > existing.lastSupported?.seconds) {
          existing.lastSupported = support.createdAt;
        }
      } else {
        grouped.set(id, {
          supporterId: id,
          email: null,
          displayName: null,
          photoURL: null,
          totalAmount: support.amount,
          supportCount: 1,
          lastSupported: support.createdAt,
        });
      }
    });

    return Array.from(grouped.values());
  }, [supports]);

  const enrichedSupporters = useMemo(() => {
    return aggregatedSupporters.map(async (supporter) => {
      if (supporter.supporterId === "anonymous") {
        return supporter;
      }

      try {
        const profileDoc = await getDoc(doc(db, "profiles", supporter.supporterId));
        if (profileDoc.exists()) {
          const profile = profileDoc.data() as Profile;
          return {
            ...supporter,
            email: profile.email || supporter.email,
            displayName: profile.displayName || supporter.displayName,
            photoURL: profile.photoURL || supporter.photoURL,
          };
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
      return supporter;
    });
  }, [aggregatedSupporters]);

  const [resolvedSupporters, setResolvedSupporters] = useState<AggregatedSupporter[]>([]);

  useEffect(() => {
    if (enrichedSupporters.length === 0) return;

    Promise.all(enrichedSupporters).then((results) => {
      setResolvedSupporters(results);
    });
  }, [enrichedSupporters]);

  const filteredSupporters = useMemo(() => {
    return resolvedSupporters.filter((supporter) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName =
          supporter.displayName?.toLowerCase().includes(search) || false;
        const matchesEmail =
          supporter.email?.toLowerCase().includes(search) || false;
        if (!matchesName && !matchesEmail) return false;
      }

      if (filterAmount === "high" && supporter.totalAmount < 5000) return false;
      if (filterAmount === "low" && supporter.totalAmount >= 5000) return false;

      return true;
    });
  }, [resolvedSupporters, searchTerm, filterAmount]);

  const totalSupportValue = useMemo(() => {
    return filteredSupporters.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSupporters]);

  const handleBroadcastEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    const recipients = filteredSupporters
      .filter((s) => s.email && s.supporterId !== "anonymous")
      .map((s) => ({
        email: s.email,
        name: s.displayName || s.email,
        handle: creator?.handle,
      }));

    if (recipients.length === 0) {
      toast.error("No valid recipients found");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch("/api/comms/email/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: emailForm.subject,
          message: emailForm.message,
          targetLabel: "supporters",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Email sent to ${data.sentCount} supporter(s)`);
        if (data.failedCount > 0) {
          toast.warning(`${data.failedCount} emails failed to send`);
        }
        setShowEmailModal(false);
        setEmailForm({ subject: "", message: "" });
      } else {
        toast.error(data.error || "Failed to send emails");
      }
    } catch (error) {
      toast.error("Failed to send emails");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={filteredSupporters.length === 0}
            className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Broadcast Email"
          >
            <Mail size={16} />
          </button>
        </div>
        <h2 className="text-xl font-bold uppercase">Supporters</h2>

        <div className="bg-orange-50 rounded-lg p-4 mt-6 mb-6">
          <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mb-1">
            Total Support
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {totalSupportValue.toLocaleString()} RWF
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">
            Supporters
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {filteredSupporters.length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            All Supporters
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {filteredSupporters.length} of {resolvedSupporters.length} supporters
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg py-3 px-4 text-sm outline-none"
            >
              <option value="all">All Amounts</option>
              <option value="high">5,000+ RWF</option>
              <option value="low">Below 5,000 RWF</option>
            </select>
          </div>
        </div>

        {filteredSupporters.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-slate-100">
            <Users size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">
              {searchTerm || filterAmount !== "all"
                ? "No supporters match your filters"
                : "No supporters yet"}
            </p>
            <p className="text-slate-400 text-sm mt-2">
              {searchTerm || filterAmount !== "all"
                ? "Try adjusting your search or filters"
                : "Supporters will appear here when people support you"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Supporter
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Total Support
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Contributions
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Last Supported
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupporters.map((supporter, index) => (
                    <tr
                      key={supporter.supporterId}
                      className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-25"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
                            {supporter.photoURL ? (
                              <img
                                src={supporter.photoURL}
                                alt={supporter.displayName || "Supporter"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (supporter.displayName?.[0] || supporter.email?.[0] || "?")[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">
                              {supporter.displayName || "Anonymous"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {supporter.email || supporter.supporterId === "anonymous" ? "Anonymous Supporter" : "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-orange-500" />
                          <span className="font-bold text-slate-900">
                            {supporter.totalAmount.toLocaleString()} RWF
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {supporter.supportCount} time{supporter.supportCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar size={12} />
                          {supporter.lastSupported?.toDate?.() ? (
                            <span>
                              {supporter.lastSupported.toDate().toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          ) : (
                            <span>Unknown</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {supporter.email && supporter.supporterId !== "anonymous" && (
                          <a
                            href={`mailto:${supporter.email}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 transition"
                          >
                            <MessageSquare size={12} />
                            Message
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      </div>

      {showEmailModal && (
        <BroadcastEmailModal
          emailForm={emailForm}
          setEmailForm={setEmailForm}
          onClose={() => setShowEmailModal(false)}
          onSend={handleBroadcastEmail}
          sending={sendingEmail}
          recipientCount={filteredSupporters.filter(
            (s) => s.email && s.supporterId !== "anonymous"
          ).length}
        />
      )}
    </div>
  );
}

function BroadcastEmailModal({
  emailForm,
  setEmailForm,
  onClose,
  onSend,
  sending,
  recipientCount,
}: {
  emailForm: { subject: string; message: string };
  setEmailForm: (form: { subject: string; message: string }) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  recipientCount: number;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-lg p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tighter">
              Broadcast Email
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Send an email to {recipientCount} supporter{recipientCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) =>
                setEmailForm({ ...emailForm, subject: e.target.value })
              }
              className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Enter email subject"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">
              Message *
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Use [NAME] to personalize with supporter&apos;s name
            </p>
            <textarea
              value={emailForm.message}
              onChange={(e) =>
                setEmailForm({ ...emailForm, message: e.target.value })
              }
              className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100 h-48 resize-none"
              placeholder="Write your message here..."
            />
          </div>

          <div className="bg-orange-50 rounded-lg p-4 text-sm">
            <p className="text-orange-800 font-medium">
              Tip: Personalize your message by using [NAME] where you want the
              supporter&apos;s name to appear.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={sending || !emailForm.subject || !emailForm.message}
              className="flex-1 bg-orange-600 text-white py-4 rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
