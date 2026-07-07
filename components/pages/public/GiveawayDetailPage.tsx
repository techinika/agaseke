/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Heart, Loader, Gift, Star, Trophy, Users, Clock, Share2 } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import { WinnersModal } from "@/components/parts/public/giveaway";
import type { Giveaway } from "@/components/parts/public/giveaway";

export default function GiveawayDetailPage({ username, giveawayId }: { username: string; giveawayId: string }) {
  const pathname = usePathname();
  const { user: currentUser, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [userTotalSupport, setUserTotalSupport] = useState(0);
  const [participating, setParticipating] = useState(false);
  const [showWinners, setShowWinners] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) { setLoading(false); return; }
        const cData = creatorSnap.data() as any;
        setCreatorData(cData);

        const userRef = doc(db, "profiles", cData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setProfileData(userSnap.data());

        const gRef = doc(db, "giveaways", giveawayId);
        const gSnap = await getDoc(gRef);
        if (!gSnap.exists()) { setLoading(false); return; }
        setGiveaway({ id: gSnap.id, ...gSnap.data() } as Giveaway);

        if (currentUser?.uid) {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", currentUser.uid), where("creatorId", "==", username));
          const ss = await getDocs(sq);
          setIsSupporter(!ss.empty);

          if (userSnap.exists()) setUserTotalSupport(userSnap.data().totalSupport || 0);

          const entriesRef = collection(db, "giveawayEntries");
          const eq = query(entriesRef, where("participantId", "==", currentUser.uid));
          const es = await getDocs(eq);
          setParticipating(es.docs.some(d => d.data().giveawayId === giveawayId));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [username, giveawayId, currentUser?.uid]);

  const canAccess = (g: Giveaway) => {
    if (g.access === "public") return true;
    if (!isSupporter) return false;
    if (g.access === "supporters") return true;
    if (g.access === "tier") return userTotalSupport >= (g.minSupportAmount || 0);
    return false;
  };

  const participate = async () => {
    if (!giveaway || !currentUser?.uid || !currentUser?.displayName) {
      toast.error("Please log in to participate"); return;
    }
    if (!canAccess(giveaway)) { toast.error("You don't meet the requirements"); return; }
    try {
      await addDoc(collection(db, "giveawayEntries"), {
        giveawayId: giveaway.id,
        participantId: currentUser.uid,
        participantName: currentUser.displayName,
        participantEmail: currentUser.email || "",
        participantPhoto: currentUser.photoURL || null,
        challengeCompleted: true,
        enteredAt: new Date(),
      });
      setParticipating(true);
      toast.success("You're in! Good luck!");
    } catch { toast.error("Failed to participate"); }
  };

  const shareGiveaway = () => {
    const text = `Enter to win: ${giveaway?.title} by ${creatorData?.name || username}!`;
    const url = `${window.location.origin}/${username}?tab=giveaways`;
    if (navigator.share) navigator.share({ title: giveaway?.title || "", text, url });
    else { navigator.clipboard.writeText(`${text} ${url}`); toast.success("Link copied!"); }
  };

  if (loading) return <DetailSkeleton />;
  if (!giveaway || !creatorData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Giveaway not found</p>
          <Link href={`/${username}`} className="text-orange-500 font-bold mt-4 inline-block">Go Back</Link>
        </div>
      </div>
    );
  }

  const endDate = giveaway.endDate instanceof Timestamp ? giveaway.endDate.toDate() : new Date(giveaway.endDate as any);
  const isActive = endDate > new Date() && (giveaway.winners?.length || 0) === 0;
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const accessible = canAccess(giveaway);

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/giveaways`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Giveaways</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-card/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {isActive ? "Active" : "Ended"}
              </span>
              <button onClick={shareGiveaway} className="bg-card/20 p-2 rounded-full hover:bg-white/30 transition">
                <Share2 size={16} />
              </button>
            </div>
            <h1 className="text-3xl font-bold mb-2">{giveaway.title}</h1>
            <p className="text-white/80">{giveaway.description}</p>
            {isActive && (
              <div className="flex items-center gap-2 mt-4 bg-card/15 px-4 py-2 rounded-lg inline-flex">
                <Clock size={16} />
                <span className="text-sm font-bold">{daysLeft} days left</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy size={16} className="text-orange-500" />
                <span className="font-bold">{giveaway.winners.length} / {giveaway.maxWinners} winners</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={16} className="text-orange-500" />
                <span className="font-bold">{giveaway.winners.length > 0 ? "Completed" : "Open"}</span>
              </div>
            </div>

            {giveaway.partners && giveaway.partners.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Partners</p>
                <div className="flex flex-wrap gap-2">
                  {giveaway.partners.map((p: any) => (
                    <span key={p.id} className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">{p.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Prizes</p>
              <div className="space-y-2">
                {giveaway.rewards.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                    <Star size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-foreground">{r.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{r.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {giveaway.winners.length > 0 && (
              <button onClick={() => setShowWinners(true)}
                className="w-full py-3 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 transition flex items-center justify-center gap-2">
                <Trophy size={16} /> View All Winners
              </button>
            )}

            {isActive && (
              <div className="border-t border-border pt-6">
                {!isLoggedIn ? (
                  <Link href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                    className="block w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-center hover:bg-orange-600 transition">
                    Log in to Enter
                  </Link>
                ) : !accessible ? (
                  <p className="text-center text-sm text-muted-foreground bg-muted py-3 rounded-xl">This giveaway requires supporter access.</p>
                ) : participating ? (
                  <p className="text-center text-sm text-emerald-600 bg-emerald-50 py-3 rounded-xl font-bold">You've entered! Good luck!</p>
                ) : (
                  <button onClick={participate}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                    <Gift size={18} /> Enter Giveaway
                  </button>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              Ends: {endDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {showWinners && giveaway && (
        <WinnersModal giveaway={giveaway} onClose={() => setShowWinners(false)} />
      )}
    </>
  );
}
