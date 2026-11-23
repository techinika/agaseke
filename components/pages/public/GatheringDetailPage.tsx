/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Loader,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  CreditCard,
  X,
  QrCode,
} from "lucide-react";
import { SupportSheet } from "@/features/support";
import { FreeRsvpSheet, PaidRsvpSheet } from "@/features/gatherings";
import { db } from "@/db/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Gathering } from "@/components/parts/public/gatherings";
import { logError, logInfo } from "@/lib/logger";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { QRCodeCanvas } from "qrcode.react";
import { getPrice } from "@/lib/priceMap";
import { formatMoney as formatCurrency } from "@/lib/format/money";

export default function GatheringDetailPage({
  username,
  gatheringId,
}: {
  username: string;
  gatheringId: string;
}) {
  const { user, profile, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gathering, setGathering] = useState<Gathering | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [userTotalSupport, setUserTotalSupport] = useState(0);
  const [payingGathering, setPayingGathering] = useState<Gathering | null>(null);
  const [freeRsvpOpen, setFreeRsvpOpen] = useState(false);
  const [attendanceDocId, setAttendanceDocId] = useState<string | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const ticketAmount = gathering ? getPrice(gathering) : 0;

  const userId = user?.uid;
  const refreshAttendance = useCallback(async () => {
    if (!userId) return;
    try {
      const attendanceRef = collection(db, "gatheringsAttendance");
      const rq = query(attendanceRef, where("gatheringId", "==", gatheringId));
      const rs = await getDocs(rq);
      const userDoc = rs.docs.find((d) => d.data().supporterId === userId);
      setIsRsvped(!!userDoc);
      if (userDoc) {
        setAttendanceDocId(userDoc.id);
      }
    } catch (e) {
      console.error("Failed to fetch attendance data:", e);
    }
  }, [gatheringId, userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) {
          setLoading(false);
          return;
        }
        setCreatorData(creatorSnap.data());

        const gRef = doc(db, "creatorGatherings", gatheringId);
        const gSnap = await getDoc(gRef);
        if (!gSnap.exists()) {
          setLoading(false);
          return;
        }
        setGathering({ id: gSnap.id, ...gSnap.data() } as Gathering);
      } catch (e) {
        console.error(e);
        logError("gathering", "GatheringDetailPage: Error loading gathering", {
          metadata: {
            username,
            gatheringId,
            errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000),
          },
        });
        setLoading(false);
        return;
      }

      if (user) {
        try {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", user.uid));
          const supportSnap = await getDocs(sq);
          const creatorSupport = supportSnap.docs.filter(
            (d) => d.data().creatorId === username,
          );
          setIsSupporter(creatorSupport.length > 0);
          let total = 0;
          creatorSupport.forEach((d) => {
            total += d.data().amount || 0;
          });
          setUserTotalSupport(total);
        } catch (e) {
          console.error("Failed to fetch support data:", e);
        }

        await refreshAttendance();
      } else {
        setIsSupporter(false);
        setUserTotalSupport(0);
        setIsRsvped(false);
        setAttendanceDocId(null);
      }

      setLoading(false);
    };
    void fetchData();
  }, [username, gatheringId, user, refreshAttendance, refreshKey]);

  const handleRSVP = () => {
    if (!user || !gathering) {
      toast.error("Please log in to RSVP");
      return;
    }

    if (getPrice(gathering) > 0) {
      setPayingGathering(gathering);
      return;
    }

    setFreeRsvpOpen(true);
  };

  const confirmFreeRsvp = async () => {
    if (!user || !gathering) {
      throw new Error("Please log in to RSVP");
    }
    if (isRsvped) {
      return;
    }

    setRsvping(true);
    try {
      const existingQuery = query(
        collection(db, "gatheringsAttendance"),
        where("supporterId", "==", user.uid),
      );
      const existingSnap = await getDocs(existingQuery);
      const alreadyDoc = existingSnap.docs.find(
        (d) => d.data().gatheringId === gathering.id,
      );
      if (alreadyDoc) {
        setAttendanceDocId(alreadyDoc.id);
        setIsRsvped(true);
        return;
      }

      const supporterName =
        profile?.displayName || user.displayName || user.email || "Supporter";
      const supporterPhoto = profile?.photoURL || user.photoURL || "";

      const docRef = await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: gathering.id,
        supporterId: user.uid,
        supporterName,
        supporterEmail: user.email,
        supporterPhoto,
        creatorHandle: username,
        createdAt: serverTimestamp(),
        checkedIn: false,
        paid: false,
      });
      setAttendanceDocId(docRef.id);
      updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: increment(1),
      }).catch((err) => {
        console.error("Failed to update attendees count", err);
      });
      setGathering((prev) =>
        prev
          ? { ...prev, attendeesCount: (prev.attendeesCount || 0) + 1 }
          : prev,
      );
      setIsRsvped(true);

      logInfo("gathering", `RSVP confirmed for gathering: "${gathering.title}"`, {
        userId: user.uid,
        userEmail: user.email || undefined,
        creatorHandle: username,
        metadata: { gatheringId: gathering.id },
      });

      sendCommsEmail("gathering_rsvp", {
        supporterName,
        supporterEmail: user.email,
        creatorHandle: username,
        creatorId: gathering.creatorId,
        gatheringId: gathering.id,
        gatheringTitle: gathering.title,
        gatheringDate: gathering.date,
        gatheringTime: gathering.time,
      }).catch((err) => {
        console.error("Failed to send RSVP email", err);
      });

      toast.success("RSVP confirmed!");
    } catch (e) {
      logError("gathering", "GatheringDetailPage: RSVP failed", {
        userId: user?.uid,
        metadata: {
          gatheringId,
          errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000),
        },
      });
      toast.error("Failed to RSVP");
      throw e;
    } finally {
      setRsvping(false);
    }
  };

  const meetsTier = (() => {
    const g = gathering;
    if (!g) return false;
    const et = g.eventType;
    if (et === "public") return true;
    if (et === "ticketed") return true;
    if (et === "supporters") return Boolean(user) && (isSupporter || userTotalSupport > 0);
    if (et === "supporters_tiered")
      return Boolean(user) && (g.minSupportTier || 0) <= userTotalSupport;
    if (getPrice(g) > 0) return true;
    if (!g.minSupportTier) return true;
    if (!user) return false;
    return g.minSupportTier <= userTotalSupport;
  })();

  if (loading) return <DetailSkeleton />;
  if (!gathering || !creatorData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-fg">Event not found</p>
          <Link
            href={`/${username}`}
            className="mt-4 inline-block font-bold text-brand-strong"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = gathering.status === "Upcoming";
  const isFull =
    gathering.capacity && gathering.attendeesCount !== undefined
      ? gathering.attendeesCount >= gathering.capacity
      : false;
  const eventDate = new Date(gathering.date);
  const formattedDate = eventDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${username}/gatherings`}
            className="flex min-h-11 items-center gap-2 text-muted-fg transition hover:text-fg"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            <span className="font-medium">Back to Events</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-control bg-brand-strong px-4 py-2 font-bold text-on-brand transition hover:opacity-90"
          >
            <Heart size={18} className="fill-current" aria-hidden="true" />
            Support
          </button>
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
          <div
            className={`p-8 ${isUpcoming ? "bg-gradient-to-r from-brand-strong to-warning" : "bg-border-strong"} text-on-brand`}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-on-brand/90">
              {isUpcoming ? "Upcoming Event" : "Past Event"}
            </span>
            <h1 className="mt-3 mb-2 text-3xl font-bold">{gathering.title}</h1>
            {gathering.description && (
              <p className="whitespace-pre-wrap text-on-brand/85">
                <LinkifyText text={gathering.description} />
              </p>
            )}
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-control bg-surface-sunken p-4">
                <Calendar size={20} className="text-brand-strong" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase text-muted-fg">Date</p>
                  <p className="text-sm font-bold text-fg">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-control bg-surface-sunken p-4">
                <Clock size={20} className="text-brand-strong" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase text-muted-fg">Time</p>
                  <p className="text-sm font-bold text-fg">{gathering.time}</p>
                </div>
              </div>
              {gathering.capacity && (
                <div className="flex items-center gap-3 rounded-control bg-surface-sunken p-4">
                  <Users size={20} className="text-brand-strong" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-fg">
                      Capacity
                    </p>
                    <p className="text-sm font-bold tabular-nums text-fg">
                      {gathering.attendeesCount || 0} / {gathering.capacity}
                    </p>
                  </div>
                </div>
              )}
              {isRsvped && gathering.location && (
                <div className="flex items-center gap-3 rounded-control bg-surface-sunken p-4">
                  <MapPin size={20} className="text-brand-strong" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-fg">
                      Location
                    </p>
                    <p className="text-sm font-bold text-fg">{gathering.location}</p>
                  </div>
                </div>
              )}
            </div>

            {isUpcoming && (
              <div className="border-t border-line pt-5">
                {isRsvped ? (
                  <div className="rounded-control border border-success bg-success-bg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-success" aria-hidden="true" />
                        <p className="text-sm font-bold text-success">
                          You&apos;re attending!{" "}
                          {isFull && "(Limited spots remaining)"}
                        </p>
                      </div>
                      {attendanceDocId && (
                        <button
                          type="button"
                          onClick={() => setShowTicket(true)}
                          className="flex min-h-10 items-center gap-1.5 rounded-control bg-success px-3 py-1.5 text-xs font-bold text-on-success transition hover:opacity-90"
                        >
                          <QrCode size={14} aria-hidden="true" /> View Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ) : isFull ? (
                  <div className="flex items-center gap-3 rounded-control border border-danger bg-danger-bg p-4">
                    <XCircle size={20} className="text-danger" aria-hidden="true" />
                    <p className="text-sm font-bold text-danger">This event is full</p>
                  </div>
                ) : ticketAmount > 0 && user ? (
                  <button
                    type="button"
                    onClick={handleRSVP}
                    disabled={rsvping}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-strong py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
                  >
                    <CreditCard size={18} aria-hidden="true" />
                    Buy Ticket (
                    {gathering?.currency || creatorData?.currency
                      ? formatCurrency(
                          ticketAmount,
                          (gathering?.currency || creatorData?.currency) as any,
                        )
                      : `${ticketAmount}`}
                    )
                  </button>
                ) : !meetsTier && user ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-control border border-warning bg-warning-bg p-4">
                    <div className="flex items-center gap-3">
                      <Lock size={20} className="text-warning shrink-0" aria-hidden="true" />
                      <p className="text-sm font-bold text-warning">
                        {gathering.eventType === "supporters"
                          ? "Supporter access is required to attend"
                          : `A minimum contribution of ${
                              gathering?.currency || creatorData?.currency
                                ? formatCurrency(
                                    gathering.minSupportTier || 0,
                                    (gathering?.currency || creatorData?.currency) as any,
                                  )
                                : `${gathering.minSupportTier || 0}`
                            } is required to attend`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="min-h-11 shrink-0 rounded-control bg-brand-strong px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
                    >
                      Support Creator
                    </button>
                  </div>
                ) : !user ? (
                  <div className="rounded-control bg-surface-sunken p-4 text-center">
                    <p className="text-sm text-muted-fg">Please log in to RSVP</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRSVP}
                    disabled={rsvping}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand-strong py-3 font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
                  >
                    {rsvping ? (
                      <Loader className="animate-spin" size={18} aria-hidden="true" />
                    ) : (
                      <CheckCircle size={18} aria-hidden="true" />
                    )}
                    Confirm RSVP
                  </button>
                )}
              </div>
            )}

            {!isUpcoming && (
              <div className="border-t border-line pt-5">
                <p className="rounded-control bg-surface-sunken py-3 text-center text-sm text-muted-fg">
                  This event has already taken place.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {freeRsvpOpen && gathering && (
        <FreeRsvpSheet
          open
          onClose={() => setFreeRsvpOpen(false)}
          creatorName={creatorData?.name || username}
          creatorPhotoURL={creatorData?.profilePicture || creatorData?.photoURL}
          creatorVerified={Boolean(creatorData?.verified)}
          title={gathering.title}
          date={gathering.date}
          time={gathering.time}
          location={gathering.location}
          onConfirm={confirmFreeRsvp}
        />
      )}

      {payingGathering && (
        <PaidRsvpSheet
          open
          onClose={() => setPayingGathering(null)}
          creatorName={creatorData?.name || username}
          creatorPhotoURL={creatorData?.profilePicture || creatorData?.photoURL}
          creatorVerified={Boolean(creatorData?.verified)}
          creatorHandle={username}
          gathering={payingGathering}
          creatorCurrency={creatorData?.currency}
          user={user}
          displayName={profile?.displayName}
          defaultPhone={profile?.phoneNumber}
          onPaid={() => {
            setIsRsvped(true);
            void refreshAttendance();
          }}
        />
      )}

      {showTicket && attendanceDocId && gathering && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-card bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-6">
              <h2 className="text-xl font-bold">Your Ticket</h2>
              <button
                type="button"
                onClick={() => setShowTicket(false)}
                className="rounded-full p-2 hover:bg-surface-sunken"
                aria-label="Close ticket"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="rounded-control bg-white p-4 shadow-inner">
                <QRCodeCanvas value={attendanceDocId} size={200} />
              </div>
              <p className="text-center text-lg font-bold">{gathering.title}</p>
              <p className="text-sm text-muted-fg">
                {gathering.date} at {gathering.time}
              </p>
              <p className="text-center text-xs text-muted-fg">
                Show this QR code at the event for check-in
              </p>
            </div>
          </div>
        </div>
      )}

      <SupportSheet
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creator={{
          uid: creatorData?.uid || "",
          handle: username,
          name: creatorData?.name || username,
          photoURL: creatorData?.profilePicture || creatorData?.photoURL || null,
          verified: Boolean(creatorData?.verified),
          currency: creatorData?.currency,
        }}
        isLoggedIn={isLoggedIn}
        user={user}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
