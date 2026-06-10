/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, Calendar, MapPin, Users, CheckCircle, XCircle, Clock, Lock, Smartphone, CreditCard, X, QrCode } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, updateDoc, orderBy, limit as fsLimit, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Gathering } from "@/components/parts/public/gatherings";
import { logError, logInfo } from "@/lib/logger";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { QRCodeCanvas } from "qrcode.react";

export default function GatheringDetailPage({ username, gatheringId }: { username: string; gatheringId: string }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gathering, setGathering] = useState<Gathering | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [userTotalSupport, setUserTotalSupport] = useState(0);
  const [payingGathering, setPayingGathering] = useState<Gathering | null>(null);
  const [payMethod, setPayMethod] = useState<"momo" | "card">("momo");
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [attendanceDocId, setAttendanceDocId] = useState<string | null>(null);
  const [showTicket, setShowTicket] = useState(false);

  const listenForTransaction = useCallback((ref: string, g: Gathering) => {
    const txRef = collection(db, "transactions");
    const q = query(txRef, where("ref", "==", ref), orderBy("createdAt", "desc"), fsLimit(1));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const tx = snap.docs[0].data();
      if (tx.status === "successful") {
        toast.success("Payment successful! You're now attending!");
        setPayingGathering(null);
        setIsRsvped(true);

        if (user?.uid) {
          try {
            const attendanceQuery = query(
              collection(db, "gatheringsAttendance"),
              where("gatheringId", "==", g.id),
            );
            const attendanceSnap = await getDocs(attendanceQuery);
            const match = attendanceSnap.docs.find(d => d.data().supporterId === user.uid);
            if (match) {
              setAttendanceDocId(match.id);
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
    setTimeout(() => { unsub(); setPaying(false); setPayingGathering(null); toast.error("Payment timed out."); }, 120000);
  }, [user]);

  useEffect(() => {
    const fetch = async () => {
      // 1. Fetch creator + gathering (isolated)
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) { setLoading(false); return; }
        setCreatorData(creatorSnap.data());

        const gRef = doc(db, "creatorGatherings", gatheringId);
        const gSnap = await getDoc(gRef);
        if (!gSnap.exists()) { setLoading(false); return; }
        setGathering({ id: gSnap.id, ...gSnap.data() } as Gathering);
      } catch (e) {
        console.error(e);
        logError("gathering", "GatheringDetailPage: Error loading gathering", {
          metadata: { username, gatheringId, errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
        });
        setLoading(false);
        return;
      }

      // 2. Fetch support + attendance (isolated, user-dependent)
      if (user) {
        try {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", user.uid));
          const supportSnap = await getDocs(sq);
          const creatorSupport = supportSnap.docs.filter(d => d.data().creatorId === username);
          setIsSupporter(creatorSupport.length > 0);
          let total = 0;
          creatorSupport.forEach((d) => { total += d.data().amount || 0; });
          setUserTotalSupport(total);
        } catch (e) {
          console.error("Failed to fetch support data:", e);
        }

        try {
          const attendanceRef = collection(db, "gatheringsAttendance");
          const rq = query(attendanceRef, where("gatheringId", "==", gatheringId));
          const rs = await getDocs(rq);
          const userDoc = rs.docs.find(d => d.data().supporterId === user.uid);
          setIsRsvped(!!userDoc);
          if (userDoc) {
            setAttendanceDocId(userDoc.id);
          }
        } catch (e) {
          console.error("Failed to fetch attendance data:", e);
        }
      } else {
        setIsSupporter(false);
        setUserTotalSupport(0);
        setIsRsvped(false);
        setAttendanceDocId(null);
      }

      setLoading(false);
    };
    fetch();
  }, [username, gatheringId, user]);

  const handleRSVP = async () => {
    if (!user || !profile || !gathering) { toast.error("Please log in to RSVP"); return; }

    if (gathering.ticketPrice && gathering.ticketPrice > 0) {
      setPayingGathering(gathering);
      setPayPhone(profile.phoneNumber || "");
      return;
    }

    setRsvping(true);
    try {
      const docRef = await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: gathering.id,
        supporterId: user.uid,
        supporterName: profile.displayName || user.email,
        supporterEmail: user.email,
        supporterPhoto: profile.photoURL || "",
        creatorHandle: username,
        createdAt: serverTimestamp(),
        checkedIn: false,
      });
      setAttendanceDocId(docRef.id);
      await updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: (gathering.attendeesCount || 0) + 1,
      });
      setIsRsvped(true);

      logInfo("gathering", `RSVP confirmed for gathering: "${gathering.title}"`, {
        userId: user.uid,
        userEmail: user.email || undefined,
        creatorHandle: username,
        metadata: { gatheringId: gathering.id },
      });

      fetch("/api/comms/email/gathering/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterName: profile.displayName || user.email,
          supporterEmail: user.email,
          creatorHandle: username,
          creatorId: gathering.creatorId,
          gatheringId: gathering.id,
          gatheringTitle: gathering.title,
          gatheringDate: gathering.date,
          gatheringTime: gathering.time,
        }),
      }).catch(() => {});

      toast.success("RSVP confirmed!");
    } catch (e) {
      logError("gathering", "GatheringDetailPage: RSVP failed", {
        userId: user?.uid,
        metadata: { gatheringId, errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
      });
      toast.error("Failed to RSVP");
    }
    finally { setRsvping(false); }
  };

  const handlePaidRSVP = async (g: Gathering) => {
    if (!user || !profile) { toast.error("Please log in"); return; }
    if (!payPhone && payMethod === "momo") { toast.error("Enter your phone number"); return; }
    setPaying(true);
    try {
      const amount = g.ticketPrice || 0;
      const endpoint = payMethod === "momo" ? "/api/support/with-momo/pay" : "/api/support/with-card/pay";
      const body: any = {
        amount,
        creatorId: username,
        creatorUid: g.creatorId,
        supporterId: user.uid,
        gatheringId: g.id,
        attendeeName: profile.displayName || user.email,
        attendeeEmail: user.email,
        includeReferral: false,
      };
      if (payMethod === "momo") { body.phone = payPhone; }
      else { body.email = user.email; body.firstName = profile.displayName || user.email || "User"; body.lastName = ""; }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Payment failed"); setPaying(false); return; }
      const ref = data.ref || data.merchant_reference;
      if (payMethod === "card" && data.redirect_url) { window.open(data.redirect_url, "_blank"); }
      listenForTransaction(ref, g);
      toast.success("Payment initiated. Waiting for confirmation...");
    } catch (e) {
      logError("gathering", "GatheringDetailPage: Paid RSVP error", {
        userId: user?.uid, metadata: { gatheringId: g.id, error: String(e) },
      });
      toast.error("Payment failed");
      setPaying(false);
    }
  };

  const meetsTier = (() => {
    const g = gathering;
    if (!g) return false;
    const et = g.eventType;
    if (et === "public") return true;
    if (et === "ticketed") return true;
    if (et === "supporters") return !!user && userTotalSupport > 0;
    if (et === "supporters_tiered") return !!user && (g.minSupportTier || 0) <= userTotalSupport;
    if (g.ticketPrice && g.ticketPrice > 0) return true;
    if (!g.minSupportTier) return true;
    if (!user) return false;
    return g.minSupportTier <= userTotalSupport;
  })();

  if (loading) return <DetailSkeleton />;
  if (!gathering || !creatorData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-muted-foreground">Event not found</p>
          <Link href={`/${username}`} className="text-orange-500 font-bold mt-4 inline-block">Go Back</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isUpcoming = gathering.status === "Upcoming";
  const isFull = gathering.capacity && gathering.attendeesCount !== undefined
    ? gathering.attendeesCount >= gathering.capacity : false;
  const eventDate = new Date(gathering.date);
  const formattedDate = eventDate.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/gatherings`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Events</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className={`p-8 ${isUpcoming ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-border-strong"} text-white`}>
            <span className="bg-card/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {isUpcoming ? "Upcoming" : "Past Event"}
            </span>
            <h1 className="text-3xl font-bold mt-4 mb-2">{gathering.title}</h1>
            {gathering.description && <p className="text-white/80 whitespace-pre-wrap"><LinkifyText text={gathering.description} /></p>}
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-muted p-4 rounded-xl">
                <Calendar size={20} className="text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Date</p>
                  <p className="text-sm font-bold text-foreground">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted p-4 rounded-xl">
                <Clock size={20} className="text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Time</p>
                  <p className="text-sm font-bold text-foreground">{gathering.time}</p>
                </div>
              </div>
              {gathering.capacity && (
                <div className="flex items-center gap-3 bg-muted p-4 rounded-xl">
                  <Users size={20} className="text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">Capacity</p>
                    <p className="text-sm font-bold text-foreground">{gathering.attendeesCount || 0} / {gathering.capacity}</p>
                  </div>
                </div>
              )}
              {isRsvped && gathering.location && (
                <div className="flex items-center gap-3 bg-muted p-4 rounded-xl">
                  <MapPin size={20} className="text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">Location</p>
                    <p className="text-sm font-bold text-foreground">{gathering.location}</p>
                  </div>
                </div>
              )}
            </div>

            {isUpcoming && (
              <div className="border-t border-border pt-5">
                {isRsvped ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-500" />
                        <p className="text-sm font-bold text-emerald-700">You're attending! {isFull && " (Limited spots remaining)"}</p>
                      </div>
                      {attendanceDocId && (
                        <button
                          onClick={() => setShowTicket(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          <QrCode size={14} /> View Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ) : isFull ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
                    <XCircle size={20} className="text-red-500" />
                    <p className="text-sm font-bold text-red-700">This event is full</p>
                  </div>
                ) : gathering.ticketPrice && gathering.ticketPrice > 0 && user ? (
                  <button onClick={handleRSVP} disabled={rsvping}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <CreditCard size={18} />
                    Buy Ticket ({gathering.ticketPrice.toLocaleString()} RWF)
                  </button>
                ) : !meetsTier && user ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
                    <Lock size={20} className="text-amber-500" />
                    <p className="text-sm font-bold text-amber-700">
                      A minimum contribution of {gathering.minSupportTier} RWF is required to attend
                    </p>
                  </div>
                ) : !user ? (
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <p className="text-sm text-muted-foreground">Please log in to RSVP</p>
                  </div>
                ) : (
                  <button onClick={handleRSVP} disabled={rsvping}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {rsvping ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Confirm RSVP
                  </button>
                )}
              </div>
            )}

            {!isUpcoming && (
              <div className="border-t border-border pt-5">
                <p className="text-center text-sm text-muted-foreground bg-muted py-3 rounded-xl">
                  This event has already taken place.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
      {showTicket && attendanceDocId && gathering && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Ticket</h2>
              <button onClick={() => setShowTicket(false)} className="p-2 hover:bg-muted rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeCanvas value={attendanceDocId} size={200} />
              </div>
              <p className="font-bold text-lg text-center">{gathering.title}</p>
              <p className="text-sm text-muted-foreground">{gathering.date} at {gathering.time}</p>
              <p className="text-xs text-muted-foreground text-center">
                Show this QR code at the event for check-in
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
