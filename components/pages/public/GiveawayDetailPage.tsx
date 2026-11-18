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
      } catch (e) { console.error("Failed to load giveaway", e); toast.error("Failed to load giveaway"); }
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
          <p className="text-muted-fg">Giveaway not found</p>
          <Link href={`/${username}`} className="text-brand-strong font-bold mt-4 inline-block">Go Back</Link>
        </div>
      </div>
    );
  }

  const endDate = giveaway.endDate instanceof Timestamp ? giveaway.endDate.toDate() : new Date(giveaway.endDate as any);
  const isActive = endDate > new Date() && (giveaway.winners?.length || 0) === 0;
  // eslint-disable-next-line react-hooks/purity
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const accessible = canAccess(giveaway);

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/giveaways`} className="flex items-center gap-2 text-muted-fg hover:text-fg transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Giveaways</span>
          </Link>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-strong to-warning p-8 text-on-brand">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-surface/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {isActive ? "Active" : "Ended"}
              </span>
              <button onClick={shareGiveaway} className="bg-surface/20 p-2 rounded-full hover:bg-white/30 transition">
                <Share2 size={16} />
              </button>
            </div>
            <h1 className="text-3xl font-bold mb-2">{giveaway.title}</h1>
            <p className="text-on-brand/80">{giveaway.description}</p>
            {isActive && (
              <div className="flex items-center gap-2 mt-4 bg-surface/15 px-4 py-2 rounded-control inline-flex">
                <Clock size={16} />
                <span className="text-sm font-bold">{daysLeft} days left</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-fg">
                <Trophy size={16} className="text-brand-strong" />
                <span className="font-bold">{giveaway.winners.length} / {giveaway.maxWinners} winners</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-fg">
                <Users size={16} className="text-brand-strong" />
                <span className="font-bold">{giveaway.winners.length > 0 ? "Completed" : "Open"}</span>
              </div>
            </div>

            {giveaway.partners && giveaway.partners.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">Partners</p>
                <div className="flex flex-wrap gap-2">
                  {giveaway.partners.map((p: any) => (
                    <span key={p.id} className="bg-surface-sunken px-3 py-1 rounded-full text-xs font-medium text-muted-fg">{p.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3">Prizes</p>
              <div className="space-y-2">
                {giveaway.rewards.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-surface-sunken p-3 rounded-control">
                    <Star size={16} className="text-warning" />
                    <span className="text-sm font-medium text-fg">{r.title}</span>
                    <span className="text-caption text-muted-fg ml-auto">{r.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {giveaway.winners.length > 0 && (
              <button onClick={() => setShowWinners(true)}
                className="w-full py-3 bg-warning-bg text-warning rounded-control font-bold text-sm hover:bg-warning-bg transition flex items-center justify-center gap-2">
                <Trophy size={16} /> View All Winners
              </button>
            )}

            {isActive && (
              <div className="border-t border-line pt-6">
                {!isLoggedIn ? (
                  <Link href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                    className="block w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold text-center hover:bg-brand-strong transition">
                    Log in to Enter
                  </Link>
                ) : !accessible ? (
                  <p className="text-center text-sm text-muted-fg bg-surface-sunken py-3 rounded-control">This giveaway requires supporter access.</p>
                ) : participating ? (
                  <p className="text-center text-sm text-success bg-success-bg py-3 rounded-control font-bold">You&apos;ve entered! Good luck!</p>
                ) : (
                  <button onClick={participate}
                    className="w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:bg-brand-strong transition flex items-center justify-center gap-2">
                    <Gift size={18} /> Enter Giveaway
                  </button>
                )}
              </div>
            )}

            <div className="text-xs text-muted-fg text-center">
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
