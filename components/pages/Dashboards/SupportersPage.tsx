/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { sendCommsEmail } from "@/lib/commsService";
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
import { BroadcastEmailModal } from "./supporterspage/index";
import { getCurrencySymbol } from "@/types/currency";

interface SupporterSupport {
  id: string;
  supporterId: string | null;
  amount: number;
  currency: string;
  createdAt: any;
  txRef: string;
  supporterPhoneNumber?: string;
}

interface AggregatedSupporter {
  supporterId: string;
  originalSupporterId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  totalAmount: number;
  currency: string;
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
      const cur = support.currency || "RWF";
      const origId = support.supporterId || "anonymous";
      const id = `${origId}_${cur}`;
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
          originalSupporterId: origId,
          email: null,
          displayName: null,
          photoURL: null,
          totalAmount: support.amount,
          currency: cur,
          supportCount: 1,
          lastSupported: support.createdAt,
        });
      }
    });

    return Array.from(grouped.values());
  }, [supports]);

  const uniqueCurrencies = useMemo(() => {
    return [...new Set(supports.map((s) => s.currency || "RWF"))];
  }, [supports]);

  const [resolvedSupporters, setResolvedSupporters] = useState<AggregatedSupporter[]>([]);

  useEffect(() => {
    if (aggregatedSupporters.length === 0) return;

    const enrich = async () => {
      const enriched = await Promise.all(
        aggregatedSupporters.map(async (supporter) => {
          if (supporter.originalSupporterId === "anonymous") {
            return supporter;
          }

          try {
            const profileDoc = await getDoc(doc(db, "profiles", supporter.originalSupporterId));
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
        })
      );
      setResolvedSupporters(enriched);
    };

    enrich();
  }, [aggregatedSupporters]);

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
      .filter((s) => s.email && s.originalSupporterId !== "anonymous")
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
      const data = await sendCommsEmail("broadcast", {
        recipients,
        subject: emailForm.subject,
        message: emailForm.message,
        targetLabel: "supporters",
      });

      if (data.success) {
        toast.success(`Email sent to ${data.recipientCount} supporter(s)`);
        setShowEmailModal(false);
        setEmailForm({ subject: "", message: "" });
      } else {
        toast.error("Failed to send emails");
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="w-64 bg-card border-r border-border hidden md:block p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition font-bold text-xs uppercase tracking-widest"
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
        <h1 className="text-xl font-bold uppercase">Supporters</h1>

        <div className="bg-orange-50 dark:bg-orange-950/50 rounded-lg p-4 mt-6 mb-6">
          <p className="text-[10px] font-bold uppercase text-orange-600 tracking-widest mb-1">
            Total Support
          </p>
          {uniqueCurrencies.map((cur) => {
            const curTotal = filteredSupporters
              .filter((s) => s.currency === cur)
              .reduce((sum, s) => sum + s.totalAmount, 0);
            return (
              <p key={cur} className="text-xl font-bold text-foreground">
                {curTotal.toLocaleString()} {getCurrencySymbol(cur)}
              </p>
            );
          })}
        </div>

        <div className="bg-muted rounded-lg p-4">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">
            Supporters
          </p>
          <p className="text-2xl font-bold text-foreground">
            {filteredSupporters.length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            All Supporters
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredSupporters.length} of {resolvedSupporters.length} supporters
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <select
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value as any)}
              className="bg-card border border-border rounded-lg py-3 px-4 text-sm outline-none"
            >
              <option value="all">All Amounts</option>
              <option value="high">High value</option>
              <option value="low">Low value</option>
            </select>
          </div>
        </div>

        {filteredSupporters.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-lg border border-border">
            <Users size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">
              {searchTerm || filterAmount !== "all"
                ? "No supporters match your filters"
                : "No supporters yet"}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {searchTerm || filterAmount !== "all"
                ? "Try adjusting your search or filters"
                : "Supporters will appear here when people support you"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Supporter
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Total Support
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Contributions
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Last Supported
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupporters.map((supporter, index) => (
                    <tr
                      key={supporter.supporterId}
                      className={`border-b border-border last:border-0 hover:bg-muted ${
                        index % 2 === 0 ? "bg-card" : "bg-muted"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
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
                            <p className="text-xs text-muted-foreground">
                              {supporter.email || supporter.supporterId === "anonymous" ? "Anonymous Supporter" : "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-orange-500" />
                          <span className="font-bold text-foreground">
                            {supporter.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            {supporter.currency}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {supporter.supportCount} time{supporter.supportCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            (s) => s.email && s.originalSupporterId !== "anonymous"
          ).length}
        />
      )}
    </div>
  );
}


