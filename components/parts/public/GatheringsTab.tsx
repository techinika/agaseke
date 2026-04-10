/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Users, Check, Loader, X } from "lucide-react";
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
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

interface Gathering {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  capacity?: number;
  minSupportTier?: number;
  attendeesCount?: number;
  creatorId: string;
  status?: string;
}

interface GatheringsTabProps {
  creatorId: string;
  creatorHandle: string;
  isSupporter: boolean;
}

export function GatheringsTab({ creatorId, creatorHandle, isSupporter }: GatheringsTabProps) {
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
      toast.error("Failed to RSVP. Please try again.");
    } finally {
      setRsvping(null);
    }
  };

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
      {gatherings.map((gathering) => {
        const isRsvped = rsvpedIds.has(gathering.id);
        const isFull = gathering.capacity && gathering.attendeesCount !== undefined 
          ? gathering.attendeesCount >= gathering.capacity 
          : false;

        return (
          <div
            key={gathering.id}
            className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="text-orange-500" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {gathering.title}
                </h3>
                {gathering.description && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                    {gathering.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{gathering.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-slate-400" />
                    <span>{gathering.time}</span>
                  </div>
                  {(isRsvped || user?.uid === gathering.creatorId) && (
                    <div className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{gathering.location}</span>
                    </div>
                  )}
                  {gathering.capacity && (
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-slate-400" />
                      <span>{gathering.attendeesCount || 0}/{gathering.capacity}</span>
                    </div>
                  )}
                </div>
                {isRsvped && !myRsvpStatus[gathering.id]?.checkedIn && !myRsvpStatus[gathering.id]?.checkInDeclined && (
                  <p className="text-xs text-orange-600 font-medium mt-2">
                    Location will be shared after check-in
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRsvped && myRsvpStatus[gathering.id]?.checkedIn ? (
                  <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                    <Check size={16} /> You&apos;re checked in
                  </span>
                ) : isRsvped && myRsvpStatus[gathering.id]?.checkInDeclined ? (
                  <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                    <X size={16} /> Check-in declined
                  </span>
                ) : isRsvped ? (
                  <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                    <Check size={16} /> You&apos;re attending
                  </span>
                ) : isFull ? (
                  <span className="text-sm font-bold text-slate-400">Event is full</span>
                ) : (
                  <span className="text-sm text-slate-500">
                    {gathering.capacity 
                      ? `${gathering.capacity - (gathering.attendeesCount || 0)} spots left`
                      : "Open to all supporters"}
                  </span>
                )}
              </div>

              {!isRsvped && !isFull && (
                <button
                  onClick={() => handleRSVP(gathering)}
                  disabled={rsvping === gathering.id}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {rsvping === gathering.id ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    "RSVP Now"
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {(pastGatherings.length > 0 || showPast) && (
        <div className="mt-8">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full py-3 text-center text-sm font-bold text-slate-500 hover:text-slate-700 transition"
          >
            {showPast ? "Hide past events" : `View ${pastGatherings.length} past event${pastGatherings.length !== 1 ? "s" : ""}`}
          </button>
          
          {showPast && (
            <div className="space-y-4 mt-4">
              {pastGatherings.map((gathering) => {
                const status = myRsvpStatus[gathering.id];
                const wasAttending = rsvpedIds.has(gathering.id);
                
                return (
                  <div
                    key={gathering.id}
                    className="bg-slate-50 rounded-xl border border-slate-100 p-6 opacity-70"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="text-slate-400" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-700 mb-2">
                          {gathering.title}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{gathering.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{gathering.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={14} className="text-slate-400" />
                            <span>{gathering.attendeesCount || 0} attended</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {wasAttending && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        {status?.checkedIn ? (
                          <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                            <Check size={16} /> You were checked in
                          </span>
                        ) : status?.checkInDeclined ? (
                          <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                            <X size={16} /> Check-in was declined
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-slate-500">
                            You RSVP&apos;d but didn&apos;t attend
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
