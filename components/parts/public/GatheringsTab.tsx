/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader, ArrowRight } from "lucide-react";
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
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { GatheringCard, PastGatheringCard } from "./gatherings";
import type { Gathering } from "./gatherings";

function logErrorToServer(message: string, metadata?: Record<string, unknown>) {
  fetch("/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "error", category: "general", message, metadata }),
  }).catch(() => {});
}

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

  useEffect(() => {
    const fetchGatherings = async () => {
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

        if (user) {
          const attendanceRef = collection(db, "gatheringsAttendance");
          const rsvpQuery = query(
            attendanceRef,
            where("supporterId", "==", user.uid),
            where("creatorHandle", "==", creatorHandle)
          );
          const rsvpSnapshot = await getDocs(rsvpQuery);
          const rsvped = new Set(rsvpSnapshot.docs.map((doc) => doc.data().gatheringId));
          setRsvpedIds(rsvped);

          const statusMap: Record<string, { checkedIn: boolean; checkInDeclined: boolean }> = {};
          rsvpSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            statusMap[data.gatheringId] = {
              checkedIn: data.checkedIn || false,
              checkInDeclined: data.checkInDeclined || false,
            };
          });
          setMyRsvpStatus(statusMap);
        }
      } catch (error) {
        console.error("Error fetching gatherings:", error);
        logErrorToServer("Error fetching gatherings", { creatorId, error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    const fetchPastGatherings = async () => {
      try {
        const gatheringsRef = collection(db, "creatorGatherings");
        const q = query(
          gatheringsRef,
          where("creatorId", "==", creatorId)
        );
        const snapshot = await getDocs(q);
        const allGatherings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Gathering[];

        const past = allGatherings.filter((g) => g.status !== "Upcoming");
        const sortedPast = past.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setPastGatherings(sortedPast);
      } catch (error) {
        console.error("Error fetching past gatherings:", error);
        logErrorToServer("Error fetching past gatherings", { creatorId, error: String(error) });
      }
    };

    fetchGatherings();
    fetchPastGatherings();
  }, [creatorId, creatorHandle, user]);

  const handleRSVP = async (gathering: Gathering) => {
    if (!user || !profile) {
      toast.error("Please log in to RSVP");
      return;
    }

    setRsvping(gathering.id);
    try {
      await addDoc(collection(db, "gatheringsAttendance"), {
        gatheringId: gathering.id,
        supporterId: user.uid,
        supporterName: profile.displayName || user.email,
        supporterEmail: user.email,
        supporterPhoto: profile.photoURL || "",
        creatorHandle,
        createdAt: serverTimestamp(),
        checkedIn: false,
      });

      await updateDoc(doc(db, "creatorGatherings", gathering.id), {
        attendeesCount: (gathering.attendeesCount || 0) + 1,
      });

      setRsvpedIds((prev) => new Set(prev).add(gathering.id));
      toast.success("RSVP confirmed!");
    } catch (error) {
      console.error("RSVP error:", error);
      logErrorToServer("RSVP error", {
        gatheringId: gathering.id,
        userId: user?.uid,
        error: String(error),
      });
      toast.error("Failed to RSVP. Please try again.");
    } finally {
      setRsvping(null);
    }
  };

  const displayGatherings = compact ? gatherings.slice(0, 2) : gatherings;
  const hasMoreGatherings = compact && gatherings.length > 2;

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
        <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
        <p className="text-slate-500 font-medium">No upcoming events</p>
        <p className="text-sm text-slate-400 mt-2">
          Check back later for new gatherings and events.
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

      {!compact && (pastGatherings.length > 0 || showPast) && (
        <div className="mt-8">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full py-3 text-center text-sm font-bold text-slate-500 hover:text-slate-700 transition"
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
    </div>
  );
}
