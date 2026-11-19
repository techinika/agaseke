/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Users,
  ArrowLeft,
  Mail,
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
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";

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
      orderBy("createdAt", "desc"),
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
      const cur = support.currency || "";
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
    return [...new Set(supports.map((s) => s.currency).filter(Boolean))] as string[];
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
            const profileDoc = await getDoc(
              doc(db, "profiles", supporter.originalSupporterId),
            );
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
        }),
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
        const matchesEmail = supporter.email?.toLowerCase().includes(search) || false;
        if (!matchesName && !matchesEmail) return false;
      }

      if (filterAmount === "high" && supporter.totalAmount < 5000) return false;
      if (filterAmount === "low" && supporter.totalAmount >= 5000) return false;

      return true;
    });
  }, [resolvedSupporters, searchTerm, filterAmount]);

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
    } catch {
      toast.error("Failed to send emails");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-8">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-72 w-full" rounded="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <div className="flex">
        <aside className="hidden w-64 border-r border-line bg-surface p-6 md:block">
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              leadingIcon={<ArrowLeft className="size-4" />}
              className="font-bold uppercase tracking-widest"
            >
              Back
            </Button>
            <IconButton
              label="Broadcast Email"
              icon={<Mail />}
              variant="primary"
              size="sm"
              onClick={() => setShowEmailModal(true)}
              disabled={filteredSupporters.length === 0}
            />
          </div>
          <h1 className="text-title font-bold uppercase">Supporters</h1>

          <div className="mt-6 mb-6 rounded-card bg-brand-soft p-4">
            <p className="mb-1 text-caption font-bold uppercase tracking-widest text-brand-strong">
              Total Support
            </p>
            {uniqueCurrencies.map((cur) => {
              const curTotal = filteredSupporters
                .filter((s) => s.currency === cur)
                .reduce((sum, s) => sum + s.totalAmount, 0);
              return (
                <p key={cur} className="text-title font-bold text-fg">
                  {curTotal.toLocaleString()} {getCurrencySymbol(cur)}
                </p>
              );
            })}
          </div>

          <div className="rounded-card bg-surface-sunken p-4">
            <p className="mb-1 text-caption font-bold uppercase tracking-widest text-muted-fg">
              Supporters
            </p>
            <p className="text-display font-bold text-fg">{filteredSupporters.length}</p>
          </div>
        </aside>

        <div className="flex-1 p-8">
          <div className="mb-8">
            <h3 className="text-label font-bold uppercase tracking-widest text-muted-fg">
              All Supporters
            </h3>
            <p className="mt-1 text-caption text-muted-fg">
              {filteredSupporters.length} of {resolvedSupporters.length} supporters
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <SearchInput
              containerClassName="max-w-md flex-1"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-fg" aria-hidden="true" />
              <Select
                containerClassName="min-w-44"
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value as any)}
              >
                <option value="all">All Amounts</option>
                <option value="high">High value</option>
                <option value="low">Low value</option>
              </Select>
            </div>
          </div>

          {filteredSupporters.length === 0 ? (
            <EmptyState
              icon={<Users className="size-6" aria-hidden="true" />}
              title={
                searchTerm || filterAmount !== "all"
                  ? "No supporters match your filters"
                  : "No supporters yet"
              }
              description={
                searchTerm || filterAmount !== "all"
                  ? "Try adjusting your search or filters"
                  : "Supporters will appear here when people support you"
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-surface-sunken">
                      <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Supporter
                      </th>
                      <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Total Support
                      </th>
                      <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Contributions
                      </th>
                      <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Last Supported
                      </th>
                      <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupporters.map((supporter, index) => (
                      <tr
                        key={supporter.supporterId}
                        className={`border-b border-line last:border-0 hover:bg-surface-raised ${
                          index % 2 === 0 ? "bg-surface" : "bg-surface-raised"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={supporter.photoURL}
                              name={supporter.displayName || supporter.email}
                              size="md"
                              className="size-10"
                            />
                            <div>
                              <p className="text-label font-bold text-fg">
                                {supporter.displayName || "Anonymous"}
                              </p>
                              <p className="text-caption text-muted-fg">
                                {supporter.email || supporter.supporterId === "anonymous"
                                  ? "Anonymous Supporter"
                                  : "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DollarSign
                              className="size-3.5 text-brand-strong"
                              aria-hidden="true"
                            />
                            <span className="font-bold text-fg">
                              {supporter.totalAmount.toLocaleString()}
                            </span>
                            <Badge tone="neutral">{supporter.currency}</Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-label text-muted-fg">
                            {supporter.supportCount} time
                            {supporter.supportCount !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-caption text-muted-fg">
                            <Calendar className="size-4" aria-hidden="true" />
                            {supporter.lastSupported?.toDate?.() ? (
                              <span>
                                {supporter.lastSupported
                                  .toDate()
                                  .toLocaleDateString("en-US", {
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
                              className="inline-flex items-center gap-1 text-caption font-bold text-brand-strong transition hover:text-brand-hover"
                            >
                              <MessageSquare className="size-4" aria-hidden="true" />
                              Message
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {showEmailModal && (
        <BroadcastEmailModal
          emailForm={emailForm}
          setEmailForm={setEmailForm}
          onClose={() => setShowEmailModal(false)}
          onSend={handleBroadcastEmail}
          sending={sendingEmail}
          recipientCount={
            filteredSupporters.filter(
              (s) => s.email && s.originalSupporterId !== "anonymous",
            ).length
          }
        />
      )}
    </div>
  );
}
