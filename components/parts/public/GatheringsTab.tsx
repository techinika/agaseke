/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Loader, ArrowRight, Lock, X, Smartphone, CreditCard } from "lucide-react";
import Link from "next/link";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit as fsLimit,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { GatheringCard, PastGatheringCard } from "./gatherings";
import type { Gathering } from "./gatherings";
import { logError, logInfo } from "@/lib/logger";
import { QRCodeCanvas } from "qrcode.react";

interface GatheringsTabProps {
  creatorId: string;
  creatorHandle: string;
  isSupporter: boolean;
  compact?: boolean;
  username?: string;
}

export function GatheringsTab({ creatorId, creatorHandle, isSupporter, compact = false, username = "" }: GatheringsTabProps) {
  const { user, profile } = useAuth();
  const [gatherings, setGatherings] = useState<Gathering[]>([]);
  const [pastGatherings, setPastGatherings] = useState<Gathering[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState<string | null>(null);
  const [rsvpedIds, setRsvpedIds] = useState<Set<string>>(new Set());
  const [showPast, setShowPast] = useState(false);
  const [myRsvpStatus, setMyRsvpStatus] = useState<Record<string, { checkedIn: boolean; checkInDeclined: boolean }>>({});
  const [userTotalSupport, setUserTotalSupport] = useState(0);
  const [attendanceDocIds, setAttendanceDocIds] = useState<Record<string, string>>({});
  const [ticketModalGathering, setTicketModalGathering] = useState<Gathering | null>(null);
  const [ticketModalDocId, setTicketModalDocId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      // 1. Fetch upcoming gatherings (isolated)
      try {
        const gatheringsRef = collection(db, "creatorGatherings");
        const q = query(
          gatheringsRef,
          where("creatorId", "==", creatorId),
          where("status", "==", "Upcoming")
        );
        const snapshot = await getDocs(q);
        const gatheringsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Gathering[];

        const sortedGatherings = gatheringsData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setGatherings(sortedGatherings);
      } catch (error) {
        console.error("Error fetching gatherings:", error);
        logError("gathering", "GatheringsTab: Error fetching gatherings", {
          creatorId,
          metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
        });
      }

      // 2. Fetch user support total (isolated)
      if (user) {
        try {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", user.uid));
          const snap = await getDocs(sq);
          const creatorSupport = snap.docs.filter(d => d.data().creatorId === creatorHandle);
          let total = 0;
          creatorSupport.forEach((d) => { total += d.data().amount || 0; });
          setUserTotalSupport(total);
        } catch {
          setUserTotalSupport(0);
        }
      } else {
        setUserTotalSupport(0);
      }

      // 3. Fetch attendance (isolated)
      if (user) {
        try {
          const attendanceRef = collection(db, "gatheringsAttendance");
          const rsvpQuery = query(
            attendanceRef,
            where("supporterId", "==", user.uid)
          );
          const rsvpSnapshot = await getDocs(rsvpQuery);
          const creatorDocs = rsvpSnapshot.docs.filter(d => d.data().creatorHandle === creatorHandle);
          const rsvped = new Set(creatorDocs.map((doc) => doc.data().gatheringId));
          setRsvpedIds(rsvped);

          const docIds: Record<string, string> = {};
          const statusMap: Record<string, { checkedIn: boolean; checkInDeclined: boolean }> = {};
          creatorDocs.forEach((doc) => {
            const data = doc.data();
            docIds[data.gatheringId] = doc.id;
            statusMap[data.gatheringId] = {
              checkedIn: data.checkedIn || false,
              checkInDeclined: data.checkInDeclined || false,
            };
          });
          setAttendanceDocIds(docIds);
          setMyRsvpStatus(statusMap);
        } catch (error) {
          console.error("Error fetching attendance:", error);
          logError("gathering", "GatheringsTab: Error fetching attendance", {
            creatorId,
            metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
          });
        }
      } else {
        setRsvpedIds(new Set());
        setAttendanceDocIds({});
        setMyRsvpStatus({});
      }

      setLoading(false);
    };

    const fetchPastGatherings = async () => {
      try {
        const gatheringsRef = collection(db, "creatorGatherings");
        const q = query(
          gatheringsRef,
          where("creatorId", "==", creatorId),
          where("status", "in", ["Disabled", "Past"])
        );
        const snapshot = await getDocs(q);
        const past = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Gathering[];

        const sortedPast = past.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setPastGatherings(sortedPast);
      } catch (error) {
        console.error("Error fetching past gatherings:", error);
        logError("gathering", "GatheringsTab: Error fetching past gatherings", {
          creatorId,
          metadata: { errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
        });
      }
    };

    fetchAll();
    fetchPastGatherings();
  }, [creatorId, creatorHandle, user]);

  const handleRSVP = async (gathering: Gathering) => {
    if (!user || !profile) {
      toast.error("Please log in to RSVP");
      return;
    }

    if (gathering.ticketPrice && gathering.ticketPrice > 0) {
      setPayingGathering(gathering);
      setPayPhone(profile.phoneNumber || "");
      return;
    }

    setRsvping(gathering.id);
    try {
      const docRef = await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: gathering.id,
        supporterId: user.uid,
        supporterName: profile.displayName || user.email,
        supporterEmail: user.email,
        supporterPhoto: profile.photoURL || "",
        creatorHandle,
        createdAt: serverTimestamp(),
        checkedIn: false,
        paid: false,
      });

      setAttendanceDocIds((prev) => ({ ...prev, [gathering.id]: docRef.id }));

      updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: (gathering.attendeesCount || 0) + 1,
      }).catch(() => {});

      setRsvpedIds((prev) => new Set(prev).add(gathering.id));

      logInfo("gathering", `RSVP confirmed for gathering: "${gathering.title}"`, {
        userId: user.uid,
        userEmail: user.email || undefined,
        creatorHandle,
        metadata: { gatheringId: gathering.id },
      });

      fetch("/api/comms/email/gathering/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterName: profile.displayName || user.email,
          supporterEmail: user.email,
          creatorHandle,
          creatorId,
          gatheringId: gathering.id,
          gatheringTitle: gathering.title,
          gatheringDate: gathering.date,
          gatheringTime: gathering.time,
        }),
      }).catch(() => {});

      toast.success("RSVP confirmed!");
    } catch (error) {
      console.error("RSVP error:", error);
      logError("gathering", "GatheringsTab: RSVP failed", {
        userId: user?.uid,
        creatorHandle,
        metadata: { gatheringId: gathering.id, errorData: JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000) },
      });
      toast.error("Failed to RSVP. Please try again.");
    } finally {
      setRsvping(null);
    }
  };

  const [payingGathering, setPayingGathering] = useState<Gathering | null>(null);
  const [payMethod, setPayMethod] = useState<"momo" | "card">("momo");
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);

  const listenForTransaction = useCallback((ref: string, gathering: Gathering) => {
    const txRef = collection(db, "transactions");
    const q = query(txRef, where("ref", "==", ref), orderBy("createdAt", "desc"), fsLimit(1));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const tx = snap.docs[0].data();
      if (tx.status === "successful") {
        toast.success("Payment successful! You're now attending!");
        setPayingGathering(null);
        setRsvpedIds((prev) => new Set(prev).add(gathering.id));
        setMyRsvpStatus((prev) => ({ ...prev, [gathering.id]: { checkedIn: false, checkInDeclined: false } }));

        if (user?.uid) {
          try {
            const attendanceQuery = query(
              collection(db, "gatheringsAttendance"),
              where("supporterId", "==", user.uid),
            );
            const attendanceSnap = await getDocs(attendanceQuery);
            const match = attendanceSnap.docs.find(d => d.data().gatheringId === gathering.id);
            if (match) {
              setAttendanceDocIds((prev) => ({ ...prev, [gathering.id]: match.id }));
            }
          } catch (e) {
            console.error("Failed to query attendance doc:", e);
          }
        }

        unsub();
      } else if (tx.status === "failed") {
        toast.error("Payment failed. Please try again.");
        setPayingGathering(null);
        setPaying(false);
        unsub();
      }
    });
    setTimeout(() => {
      unsub();
      if (paying) {
        setPaying(false);
        setPayingGathering(null);
        toast.error("Payment timed out. Please try again.");
      }
    }, 120000);
  }, [paying, user]);

  const handlePaidRSVP = async (gathering: Gathering) => {
    if (!user || !profile) {
      toast.error("Please log in to RSVP");
      return;
    }
    if (!payPhone && payMethod === "momo") {
      toast.error("Please enter your phone number");
      return;
    }
    setPaying(true);
    try {
      const amount = gathering.ticketPrice || 0;
      const endpoint = payMethod === "momo" ? "/api/support/with-momo/pay" : "/api/support/with-card/pay";
      const body: any = {
        amount,
        creatorId: creatorHandle,
        creatorUid: creatorId,
        supporterId: user.uid,
        gatheringId: gathering.id,
        attendeeName: profile.displayName || user.email,
        attendeeEmail: user.email,
        includeReferral: false,
      };
      if (payMethod === "momo") {
        body.phone = payPhone;
      } else {
        body.email = user.email;
        body.firstName = profile.displayName || user.email || "User";
        body.lastName = "";
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Payment failed to initiate");
        setPaying(false);
        return;
      }
      const ref = data.ref || data.merchant_reference;
      if (payMethod === "card" && data.redirect_url) {
        window.open(data.redirect_url, "_blank");
      }
      listenForTransaction(ref, gathering);
      toast.success("Payment initiated. Waiting for confirmation...");
    } catch (error) {
      console.error("Payment error:", error);
      logError("gathering", "GatheringsTab: Paid RSVP payment error", {
        userId: user?.uid,
        metadata: { gatheringId: gathering.id, error: String(error) },
      });
      toast.error("Payment failed. Please try again.");
      setPaying(false);
    }
  };

  const meetsTier = (gathering: Gathering) => {
    const et = gathering.eventType;
    if (et === "public") return true;
    if (et === "ticketed") return true;
    if (et === "supporters") return !!user && (isSupporter || userTotalSupport > 0);
    if (et === "supporters_tiered") return !!user && (gathering.minSupportTier || 0) <= userTotalSupport;
    if (gathering.ticketPrice && gathering.ticketPrice > 0) return true;
    if (!gathering.minSupportTier) return true;
    if (!user) return false;
    return gathering.minSupportTier <= userTotalSupport;
  };

  const isCreatorViewing = user?.uid === creatorId;

  const visibleGatherings = isCreatorViewing
    ? gatherings
    : gatherings.filter((g) => meetsTier(g));
  const displayGatherings = compact ? visibleGatherings.slice(0, 2) : visibleGatherings;
  const hasMoreGatherings = compact && visibleGatherings.length > 2;

  const lockedGatherings = !isCreatorViewing
    ? gatherings.filter((g) => !meetsTier(g))
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="animate-spin text-orange-500" size={24} />
      </div>
    );
  }

  if (gatherings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto text-muted-foreground mb-4" size={48} />
        <p className="text-muted-foreground font-medium">No upcoming events</p>
        <p className="text-sm text-muted-foreground mt-2">
          Check back later for new gatherings and events.
        </p>
      </div>
    );
  }

  if (visibleGatherings.length === 0 && lockedGatherings.length > 0) {
    return (
      <div className="text-center py-12">
        <Lock className="mx-auto text-muted-foreground mb-4" size={48} />
        <p className="text-muted-foreground font-medium">Exclusive events available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Contribute to unlock access to their private gatherings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayGatherings.map((gathering) => {
        const isRsvped = rsvpedIds.has(gathering.id);
        const isFull = gathering.capacity && gathering.attendeesCount !== undefined
          ? gathering.attendeesCount >= gathering.capacity
          : false;

        return (
          <GatheringCard
            key={gathering.id}
            gathering={gathering}
            isRsvped={isRsvped}
            isFull={isFull}
            rsvping={rsvping === gathering.id}
            myRsvpStatus={myRsvpStatus[gathering.id] || { checkedIn: false, checkInDeclined: false }}
            onRSVP={() => handleRSVP(gathering)}
            userId={user?.uid}
            creatorHandle={creatorHandle}
            showTicket={!!attendanceDocIds[gathering.id]}
            onViewTicket={() => {
              setTicketModalGathering(gathering);
              setTicketModalDocId(attendanceDocIds[gathering.id]);
            }}
          />
        );
      })}

      {hasMoreGatherings && (
        <div className="text-center">
          <Link
            href={`/${username}/gatherings`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition shadow-lg"
          >
            See All Events <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {lockedGatherings.length > 0 && visibleGatherings.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={16} className="text-muted-foreground" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {lockedGatherings.length} locked event{lockedGatherings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">
              A minimum contribution of {Math.min(...lockedGatherings.map(g => g.minSupportTier || 0))} RWF is required to unlock exclusive gatherings.
            </p>
          </div>
        </div>
      )}

      {!compact && (pastGatherings.length > 0 || showPast) && (
        <div className="mt-8">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full py-3 text-center text-sm font-bold text-muted-foreground hover:text-foreground transition"
          >
            {showPast ? "Hide past events" : `View ${pastGatherings.length} past event${pastGatherings.length !== 1 ? "s" : ""}`}
          </button>

          {showPast && (
            <div className="space-y-4 mt-4">
              {pastGatherings.map((gathering) => (
                <PastGatheringCard
                  key={gathering.id}
                  gathering={gathering}
                  wasAttending={rsvpedIds.has(gathering.id)}
                  myRsvpStatus={myRsvpStatus[gathering.id]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal for Paid Gatherings */}
      {payingGathering && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Buy Ticket</h2>
              <button onClick={() => { setPayingGathering(null); setPaying(false); }} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Event</p>
                <p className="font-bold">{payingGathering.title}</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{payingGathering.ticketPrice?.toLocaleString()} RWF</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPayMethod("momo")}
                  className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                    payMethod === "momo" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-border text-muted-foreground"
                  }`}
                >
                  <Smartphone size={18} /> MoMo
                </button>
                <button
                  onClick={() => setPayMethod("card")}
                  className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                    payMethod === "card" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-border text-muted-foreground"
                  }`}
                >
                  <CreditCard size={18} /> Card
                </button>
              </div>

              {payMethod === "momo" && (
                <input
                  type="tel"
                  placeholder="Phone number (e.g. 078xxxxxxx)"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  className="w-full bg-muted p-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
              )}

              <button
                onClick={() => handlePaidRSVP(payingGathering)}
                disabled={paying || (payMethod === "momo" && !payPhone)}
                className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? <Loader size={20} className="animate-spin" /> : null}
                {paying ? "Processing..." : `Pay ${payingGathering.ticketPrice?.toLocaleString()} RWF`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalGathering && ticketModalDocId && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Ticket</h2>
              <button onClick={() => { setTicketModalGathering(null); setTicketModalDocId(null); }} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeCanvas value={ticketModalDocId} size={200} />
              </div>
              <p className="font-bold text-lg text-center">{ticketModalGathering.title}</p>
              <p className="text-sm text-muted-foreground">{ticketModalGathering.date} at {ticketModalGathering.time}</p>
              <p className="text-xs text-muted-foreground text-center">
                Show this QR code at the event for check-in
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
