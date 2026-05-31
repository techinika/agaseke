/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, Calendar, MapPin, Users, CheckCircle, XCircle, Clock, Lock } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import type { Gathering } from "@/components/parts/public/gatherings";
import { logError, logInfo } from "@/lib/logger";

export default function GatheringDetailPage({ username, gatheringId }: { username: string; gatheringId: string }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gathering, setGathering] = useState<Gathering | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [userTotalSupport, setUserTotalSupport] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) { setLoading(false); return; }
        setCreatorData(creatorSnap.data());

        const gRef = doc(db, "creatorGatherings", gatheringId);
        const gSnap = await getDoc(gRef);
        if (!gSnap.exists()) { setLoading(false); return; }
        setGathering({ id: gSnap.id, ...gSnap.data() } as Gathering);

        if (user) {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", user.uid), where("creatorId", "==", username));
          const supportSnap = await getDocs(sq);
          setIsSupporter(!supportSnap.empty);
          let total = 0;
          supportSnap.forEach((d) => { total += d.data().amount || 0; });
          setUserTotalSupport(total);

          const attendanceRef = collection(db, "gatheringsAttendance");
          const rq = query(attendanceRef, where("supporterId", "==", user.uid), where("creatorHandle", "==", username));
          const rs = await getDocs(rq);
          setIsRsvped(rs.docs.some(d => d.data().gatheringId === gatheringId));
        }
      } catch (e) {
        console.error(e);
        logError("support", "GatheringDetailPage: Error loading gathering", {
          metadata: { username, gatheringId, errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
        });
      }
      finally { setLoading(false); }
    };
    fetch();
  }, [username, gatheringId, user]);

  const handleRSVP = async () => {
    if (!user || !profile || !gathering) { toast.error("Please log in to RSVP"); return; }
    setRsvping(true);
    try {
      await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: gathering.id,
        supporterId: user.uid,
        supporterName: profile.displayName || user.email,
        supporterEmail: user.email,
        supporterPhoto: profile.photoURL || "",
        creatorHandle: username,
        createdAt: serverTimestamp(),
        checkedIn: false,
      });
      await updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: (gathering.attendeesCount || 0) + 1,
      });
      setIsRsvped(true);

      logInfo("support", `RSVP confirmed for gathering: "${gathering.title}"`, {
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
      logError("support", "GatheringDetailPage: RSVP failed", {
        userId: user?.uid,
        metadata: { gatheringId, errorData: JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 5000) },
      });
      toast.error("Failed to RSVP");
    }
    finally { setRsvping(false); }
  };

  const meetsTier = gathering?.minSupportTier ? userTotalSupport >= gathering.minSupportTier : true;

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
            {gathering.description && <p className="text-white/80">{gathering.description}</p>}
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
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-700">You're attending! {isFull && " (Limited spots remaining)"}</p>
                  </div>
                ) : isFull ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
                    <XCircle size={20} className="text-red-500" />
                    <p className="text-sm font-bold text-red-700">This event is full</p>
                  </div>
                ) : !meetsTier && user ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
                    <Lock size={20} className="text-amber-500" />
                    <p className="text-sm font-bold text-amber-700">
                      Support this creator with at least {gathering.minSupportTier} RWF to RSVP
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
      <Footer />
    </div>
  );
}
