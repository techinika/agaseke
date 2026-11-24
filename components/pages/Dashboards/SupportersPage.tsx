/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Users,
  Mail,
  Filter,
  MessageSquare,
  HandCoins,
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
import {
  getCurrencyDefinition,
  isCurrencyCode,
  resolveHistoricalCurrency,
} from "@/lib/money";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { CreatorMessagesPanel } from "./MessagesPage";

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

type SupportersTabId = "supporters" | "messages";

export default function SupportersPage() {
  const { creator } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const chatFromUrl = searchParams.get("chat");
  const activeTab: SupportersTabId =
    tabFromUrl === "messages" || Boolean(chatFromUrl) ? "messages" : "supporters";

  const [supports, setSupports] = useState<SupporterSupport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAmount, setFilterAmount] = useState<"all" | "high" | "low">("all");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [emailForm, setEmailForm] = useState({
    subject: "",
    message: "",
  });

  const handleTabChange = (nextTab: string) => {
    const validTab: SupportersTabId =
      nextTab === "messages" ? "messages" : "supporters";
    const params = new URLSearchParams(searchParams.toString());
    if (validTab === "supporters") {
      params.delete("tab");
      params.delete("chat");
    } else {
      params.set("tab", "messages");
    }
    const qs = params.toString();
    router.replace(qs ? `/creator/supporters?${qs}` : "/creator/supporters", {
      scroll: false,
    });
  };

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

  useEffect(() => {
    if (!creator?.uid) return;
    const q = query(collection(db, "chatrooms"), where("creatorId", "==", creator.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.reduce((sum, docSnap) => {
        const count = Number(docSnap.data().unreadCount || 0);
        return sum + count;
      }, 0);
      setUnreadMessagesCount(unread);
    });
    return () => unsub();
  }, [creator?.uid]);

  const aggregatedSupporters = useMemo(() => {
    const grouped = new Map<string, AggregatedSupporter>();

    supports.forEach((support) => {
      const cur = resolveHistoricalCurrency(support as unknown as Record<string, unknown>);
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
    return [
      ...new Set(
        supports
          .map((s) => resolveHistoricalCurrency(s as unknown as Record<string, unknown>))
          .filter(Boolean),
      ),
    ] as string[];
  }, [supports]);

  const [resolvedSupporters, setResolvedSupporters] = useState<AggregatedSupporter[]>([]);

  useEffect(() => {
    if (aggregatedSupporters.length === 0) {
      queueMicrotask(() => setResolvedSupporters([]));
      return;
    }

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
    const isHighValue = (supporter: AggregatedSupporter) => {
      const code = supporter.currency.toUpperCase();
      const minorUnit = isCurrencyCode(code) ? getCurrencyDefinition(code).minorUnit : 0;
      const threshold = minorUnit === 0 ? 5000 : 5;
      return supporter.totalAmount >= threshold;
    };

    return resolvedSupporters.filter((supporter) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName =
          supporter.displayName?.toLowerCase().includes(search) || false;
        const matchesEmail = supporter.email?.toLowerCase().includes(search) || false;
        if (!matchesName && !matchesEmail) return false;
      }

      if (filterAmount === "high" && !isHighValue(supporter)) return false;
      if (filterAmount === "low" && isHighValue(supporter)) return false;

      return true;
    });
  }, [resolvedSupporters, searchTerm, filterAmount]);

  const emailableCount = filteredSupporters.filter(
    (s) => s.email && s.originalSupporterId !== "anonymous",
  ).length;

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
      <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="space-y-2 p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-72 w-full" rounded="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <PageHeader
          title="Supporters & Messages"
          description="Track your backers, send email updates, and reply to direct messages."
          className="mb-6 [&_h1]:font-display [&_h1]:text-heading [&_h1]:sm:text-display"
          actions={
            <Button
              variant="primary"
              size="md"
              leadingIcon={<Mail className="size-4" aria-hidden="true" />}
              onClick={() => setShowEmailModal(true)}
              disabled={emailableCount === 0}
            >
              Email Supporters
            </Button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-semibold text-muted-fg">Total Support</p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-title font-bold tabular-nums text-fg">
                  {uniqueCurrencies.length === 0 ? (
                    <span>0</span>
                  ) : (
                    uniqueCurrencies.map((cur) => {
                      const curTotal = filteredSupporters
                        .filter((s) => s.currency === cur)
                        .reduce((sum, s) => sum + s.totalAmount, 0);
                      return (
                        <span key={cur}>
                          {curTotal.toLocaleString()} {getCurrencySymbol(cur)}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                <HandCoins className="size-5" aria-hidden="true" />
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-semibold text-muted-fg">Supporters</p>
                <p className="mt-1.5 text-title font-bold tabular-nums text-fg">
                  {filteredSupporters.length}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-info-bg text-info">
                <Users className="size-5" aria-hidden="true" />
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <button
              type="button"
              onClick={() => handleTabChange("messages")}
              className="flex w-full items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <div className="min-w-0">
                <p className="text-caption font-semibold text-muted-fg">
                  Unread Messages
                </p>
                <p className="mt-1.5 text-title font-bold tabular-nums text-fg">
                  {unreadMessagesCount}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-raised text-fg">
                <MessageSquare className="size-5" aria-hidden="true" />
              </span>
            </button>
          </Card>
        </div>

        <Tabs
          ariaLabel="Supporters and messages"
          value={activeTab}
          onChange={handleTabChange}
          items={[
            {
              id: "supporters",
              label: "Supporters",
              icon: <Users className="size-4" aria-hidden="true" />,
              badge:
                resolvedSupporters.length > 0 ? resolvedSupporters.length : undefined,
            },
            {
              id: "messages",
              label: "Messages",
              icon: <MessageSquare className="size-4" aria-hidden="true" />,
              badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
            },
          ]}
          className="mb-6"
        />

        {activeTab === "supporters" ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                  aria-label="Search supporters"
                  containerClassName="w-full sm:max-w-md"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Filter className="size-4 shrink-0 text-muted-fg" aria-hidden="true" />
                  <Select
                    aria-label="Filter support amount"
                    containerClassName="w-full sm:w-44"
                    value={filterAmount}
                    onChange={(e) => setFilterAmount(e.target.value as any)}
                  >
                    <option value="all">All Amounts</option>
                    <option value="high">High value</option>
                    <option value="low">Low value</option>
                  </Select>
                </div>
              </div>
              <p className="text-caption tabular-nums text-muted-fg">
                {filteredSupporters.length} of {resolvedSupporters.length} supporters
              </p>
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
                    : "Supporters will appear here when people support your page."
                }
              />
            ) : (
              <>
                {/* Mobile list */}
                <Card className="divide-y divide-line overflow-hidden md:hidden">
                  {filteredSupporters.map((supporter) => {
                    const isAnon = supporter.originalSupporterId === "anonymous";
                    const lastDate = supporter.lastSupported?.toDate?.()
                      ? supporter.lastSupported.toDate().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unknown";

                    return (
                      <div key={supporter.supporterId} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              src={supporter.photoURL}
                              name={supporter.displayName || supporter.email}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-label font-bold text-fg">
                                {supporter.displayName || "Anonymous"}
                              </p>
                              <p className="truncate text-caption text-muted-fg">
                                {isAnon
                                  ? "Anonymous Supporter"
                                  : supporter.email || "No email"}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-label font-bold tabular-nums text-fg">
                              {supporter.totalAmount.toLocaleString()}{" "}
                              {getCurrencySymbol(supporter.currency)}
                            </p>
                            <p className="text-caption text-muted-fg">
                              {supporter.supportCount}x
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-caption text-muted-fg">
                          <span className="tabular-nums">Last supported {lastDate}</span>
                          {supporter.email && !isAnon && (
                            <a
                              href={`mailto:${supporter.email}`}
                              className="inline-flex items-center gap-1 font-semibold text-brand-strong hover:text-brand-hover"
                            >
                              <Mail className="size-3.5" aria-hidden="true" />
                              Email
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {/* Desktop table */}
                <Card className="hidden overflow-hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line bg-surface-sunken">
                          <th className="px-5 py-3.5 text-left text-caption font-semibold text-muted-fg">
                            Supporter
                          </th>
                          <th className="px-5 py-3.5 text-right text-caption font-semibold text-muted-fg">
                            Total Support
                          </th>
                          <th className="px-5 py-3.5 text-right text-caption font-semibold text-muted-fg">
                            Contributions
                          </th>
                          <th className="px-5 py-3.5 text-right text-caption font-semibold text-muted-fg">
                            Last Supported
                          </th>
                          <th className="px-5 py-3.5 text-right text-caption font-semibold text-muted-fg">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredSupporters.map((supporter) => {
                          const isAnon = supporter.originalSupporterId === "anonymous";
                          return (
                            <tr
                              key={supporter.supporterId}
                              className="transition-colors hover:bg-surface-sunken"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    src={supporter.photoURL}
                                    name={supporter.displayName || supporter.email}
                                    size="md"
                                    className="size-10"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-label font-bold text-fg">
                                      {supporter.displayName || "Anonymous"}
                                    </p>
                                    <p className="truncate text-caption text-muted-fg">
                                      {isAnon
                                        ? "Anonymous Supporter"
                                        : supporter.email || "No email"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right font-bold tabular-nums text-fg">
                                {supporter.totalAmount.toLocaleString()}{" "}
                                <span className="text-caption font-semibold text-muted-fg">
                                  {supporter.currency}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right text-label tabular-nums text-muted-fg">
                                {supporter.supportCount} time
                                {supporter.supportCount !== 1 ? "s" : ""}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-right text-caption tabular-nums text-muted-fg">
                                {supporter.lastSupported?.toDate?.()
                                  ? supporter.lastSupported
                                      .toDate()
                                      .toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                  : "Unknown"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {supporter.email && !isAnon && (
                                  <a
                                    href={`mailto:${supporter.email}`}
                                    className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand-strong transition-colors hover:text-brand-hover"
                                  >
                                    <Mail className="size-3.5" aria-hidden="true" />
                                    Email
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        ) : (
          <CreatorMessagesPanel
            embedded
            onUnreadChange={setUnreadMessagesCount}
          />
        )}
      </div>

      {showEmailModal && (
        <BroadcastEmailModal
          emailForm={emailForm}
          setEmailForm={setEmailForm}
          onClose={() => setShowEmailModal(false)}
          onSend={handleBroadcastEmail}
          sending={sendingEmail}
          recipientCount={emailableCount}
        />
      )}
    </div>
  );
}
