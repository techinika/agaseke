/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import { initiateMomoPayment, initiateCardPayment } from "@/lib/paymentsService";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, Calendar, MapPin, Users, CheckCircle, XCircle, Clock, Lock, Smartphone, CreditCard, X, QrCode } from "lucide-react";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, updateDoc, orderBy, limit as fsLimit, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Gathering } from "@/components/parts/public/gatherings";
import { logError, logInfo } from "@/lib/logger";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { QRCodeCanvas } from "qrcode.react";
import { getPrice } from "@/lib/priceMap";
import { formatMoney as formatCurrency } from "@/lib/format/money";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ticketAmount = gathering ? getPrice(gathering) : 0;

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

    if (getPrice(gathering) > 0) {
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
        paid: false,
      });
      setAttendanceDocId(docRef.id);
      updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: (gathering.attendeesCount || 0) + 1,
      }).catch((err) => { console.error("Failed to update attendees count", err); });
      setIsRsvped(true);

      logInfo("gathering", `RSVP confirmed for gathering: "${gathering.title}"`, {
        userId: user.uid,
        userEmail: user.email || undefined,
        creatorHandle: username,
        metadata: { gatheringId: gathering.id },
      });

      sendCommsEmail("gathering_rsvp", {
        supporterName: profile.displayName || user.email,
        supporterEmail: user.email,
        creatorHandle: username,
        creatorId: gathering.creatorId,
        gatheringId: gathering.id,
        gatheringTitle: gathering.title,
        gatheringDate: gathering.date,
        gatheringTime: gathering.time,
      }).catch((err) => { console.error("Failed to send RSVP email", err); });

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
      let ref: string;
      if (payMethod === "momo") {
        const data = await initiateMomoPayment({
          type: "gathering",
          creatorHandle: username,
          gatheringId: g.id,
          phone: payPhone,
          attendeeName: profile.displayName || user.email || undefined,
          attendeeEmail: user.email || undefined,
          idempotencyKey: crypto.randomUUID(),
        });
        ref = data.ref;
      } else {
        const data = await initiateCardPayment({
          type: "gathering",
          creatorHandle: username,
          gatheringId: g.id,
          email: user.email || undefined,
          firstName: profile.displayName || user.email || "User",
          lastName: "",
          attendeeName: profile.displayName || user.email || undefined,
          attendeeEmail: user.email || undefined,
          idempotencyKey: crypto.randomUUID(),
        });
        ref = data.merchant_reference || data.ref;
        if (data.redirect_url) { window.open(data.redirect_url, "_blank"); }
      }
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
    if (getPrice(g) > 0) return true;
    if (!g.minSupportTier) return true;
    if (!user) return false;
    return g.minSupportTier <= userTotalSupport;
  })();

  if (loading) return <DetailSkeleton />;
  if (!gathering || !creatorData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-fg">Event not found</p>
          <Link href={`/${username}`} className="text-brand-strong font-bold mt-4 inline-block">Go Back</Link>
        </div>
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
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/gatherings`} className="flex items-center gap-2 text-muted-fg hover:text-fg transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Events</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-strong text-on-brand px-4 py-2 rounded-control font-bold hover:bg-brand-strong transition"
          >
            <Heart size={18} className="fill-current" />
            Support
          </button>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden shadow-sm">
          <div className={`p-8 ${isUpcoming ? "bg-gradient-to-r from-brand-strong to-warning" : "bg-border-strong"} text-on-brand`}>
            <span className="bg-surface/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {isUpcoming ? "Upcoming" : "Past Event"}
            </span>
            <h1 className="text-3xl font-bold mt-4 mb-2">{gathering.title}</h1>
            {gathering.description && <p className="text-on-brand/80 whitespace-pre-wrap"><LinkifyText text={gathering.description} /></p>}
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-surface-sunken p-4 rounded-control">
                <Calendar size={20} className="text-brand-strong" />
                <div>
                  <p className="text-xs text-muted-fg font-bold uppercase">Date</p>
                  <p className="text-sm font-bold text-fg">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-surface-sunken p-4 rounded-control">
                <Clock size={20} className="text-brand-strong" />
                <div>
                  <p className="text-xs text-muted-fg font-bold uppercase">Time</p>
                  <p className="text-sm font-bold text-fg">{gathering.time}</p>
                </div>
              </div>
              {gathering.capacity && (
                <div className="flex items-center gap-3 bg-surface-sunken p-4 rounded-control">
                  <Users size={20} className="text-brand-strong" />
                  <div>
                    <p className="text-xs text-muted-fg font-bold uppercase">Capacity</p>
                    <p className="text-sm font-bold text-fg">{gathering.attendeesCount || 0} / {gathering.capacity}</p>
                  </div>
                </div>
              )}
              {isRsvped && gathering.location && (
                <div className="flex items-center gap-3 bg-surface-sunken p-4 rounded-control">
                  <MapPin size={20} className="text-brand-strong" />
                  <div>
                    <p className="text-xs text-muted-fg font-bold uppercase">Location</p>
                    <p className="text-sm font-bold text-fg">{gathering.location}</p>
                  </div>
                </div>
              )}
            </div>

            {isUpcoming && (
              <div className="border-t border-line pt-5">
                {isRsvped ? (
                  <div className="bg-success-bg border border-success p-4 rounded-control">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-success" />
                        <p className="text-sm font-bold text-success">You&apos;re attending! {isFull && " (Limited spots remaining)"}</p>
                      </div>
                      {attendanceDocId && (
                        <button
                          onClick={() => setShowTicket(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-success text-on-success rounded-control text-xs font-bold hover:bg-success transition"
                        >
                          <QrCode size={14} /> View Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ) : isFull ? (
                  <div className="bg-danger-bg border border-danger p-4 rounded-control flex items-center gap-3">
                    <XCircle size={20} className="text-danger" />
                    <p className="text-sm font-bold text-danger">This event is full</p>
                  </div>
                ) : ticketAmount > 0 && user ? (
                  <button onClick={handleRSVP} disabled={rsvping}
                    className="w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:bg-brand-strong transition disabled:opacity-50 flex items-center justify-center gap-2">
                    <CreditCard size={18} />
                    Buy Ticket ({gathering?.currency ? formatCurrency(ticketAmount, gathering.currency as any) : `${ticketAmount}`})
                  </button>
                ) : !meetsTier && user ? (
                  <div className="bg-warning-bg border border-warning p-4 rounded-control flex items-center gap-3">
                    <Lock size={20} className="text-warning" />
                    <p className="text-sm font-bold text-warning">
                      A minimum contribution of {gathering?.currency ? formatCurrency(gathering.minSupportTier || 0, gathering.currency as any) : `${gathering.minSupportTier || 0}`} is required to attend
                    </p>
                  </div>
                ) : !user ? (
                  <div className="bg-surface-sunken p-4 rounded-control text-center">
                    <p className="text-sm text-muted-fg">Please log in to RSVP</p>
                  </div>
                ) : (
                  <button onClick={handleRSVP} disabled={rsvping}
                    className="w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:bg-brand-strong transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {rsvping ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Confirm RSVP
                  </button>
                )}
              </div>
            )}

            {!isUpcoming && (
              <div className="border-t border-line pt-5">
                <p className="text-center text-sm text-muted-fg bg-surface-sunken py-3 rounded-control">
                  This event has already taken place.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {payingGathering && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface w-full max-w-md rounded-card overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-line flex justify-between items-center">
              <h2 className="text-xl font-bold">Buy Ticket</h2>
              <button onClick={() => { setPayingGathering(null); setPaying(false); }} className="p-2 hover:bg-surface-sunken rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-surface-sunken p-4 rounded-control">
                <p className="text-sm text-muted-fg">Event</p>
                <p className="font-bold">{payingGathering.title}</p>
                <p className="text-2xl font-bold text-brand-strong mt-2">{payingGathering?.currency ? formatCurrency(getPrice(payingGathering), payingGathering.currency as any) : `${getPrice(payingGathering)}`}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPayMethod("momo")}
                  className={`flex-1 p-3 rounded-control border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                    payMethod === "momo" ? "border-brand-strong bg-brand-soft text-brand-strong" : "border-line text-muted-fg"
                  }`}
                >
                  <Smartphone size={18} /> MoMo
                </button>
                <button
                  onClick={() => setPayMethod("card")}
                  className={`flex-1 p-3 rounded-control border-2 font-bold text-sm flex items-center justify-center gap-2 transition ${
                    payMethod === "card" ? "border-brand-strong bg-brand-soft text-brand-strong" : "border-line text-muted-fg"
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
                  className="w-full bg-surface-sunken p-4 rounded-control text-sm outline-none focus:ring-2 focus:ring-brand-soft"
                />
              )}

              <button
                onClick={() => handlePaidRSVP(payingGathering)}
                disabled={paying || (payMethod === "momo" && !payPhone)}
                className="w-full py-4 bg-brand-strong text-on-brand rounded-control font-bold text-lg hover:bg-brand-strong transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? <Loader size={20} className="animate-spin" /> : null}
                {paying ? "Processing..." : `Pay ${payingGathering?.currency ? formatCurrency(getPrice(payingGathering), payingGathering.currency as any) : `${getPrice(payingGathering)}`}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {showTicket && attendanceDocId && gathering && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface w-full max-w-sm rounded-card overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-line flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Ticket</h2>
              <button onClick={() => setShowTicket(false)} className="p-2 hover:bg-surface-sunken rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-control shadow-inner">
                <QRCodeCanvas value={attendanceDocId} size={200} />
              </div>
              <p className="font-bold text-lg text-center">{gathering.title}</p>
              <p className="text-sm text-muted-fg">{gathering.date} at {gathering.time}</p>
              <p className="text-xs text-muted-fg text-center">
                Show this QR code at the event for check-in
              </p>
            </div>
          </div>
        </div>
      )}

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creatorData?.name || username}
        creatorId={username}
        uid={creatorData?.uid || ""}
        includeReferral={false}
      />
    </>
  );
}
