/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Heart, Gift, Star, Trophy, Users, Clock, Share2 } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import { WinnersModal } from "@/components/parts/public/giveaway";
import type { Giveaway } from "@/components/parts/public/giveaway";
import { GiveawayEntrySheet } from "@/features/giveaways";
import { SupportSheet } from "@/features/support";
import { formatMoney as formatCurrency } from "@/lib/format/money";

export default function GiveawayDetailPage({ username, giveawayId }: { username: string; giveawayId: string }) {
  const pathname = usePathname();
  const { user: currentUser, profile, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [userTotalSupport, setUserTotalSupport] = useState(0);
  const [participating, setParticipating] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) {
          setLoading(false);
          return;
        }
        const cData = creatorSnap.data() as any;
        setCreatorData(cData);

        const userRef = doc(db, "profiles", cData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setProfileData(userSnap.data());

        const gRef = doc(db, "giveaways", giveawayId);
        const gSnap = await getDoc(gRef);
        if (!gSnap.exists()) {
          setLoading(false);
          return;
        }
        setGiveaway({ id: gSnap.id, ...gSnap.data() } as Giveaway);

        if (currentUser?.uid) {
          const supportRef = collection(db, "supportedCreators");
          const sq = query(supportRef, where("supporterId", "==", currentUser.uid));
          const ss = await getDocs(sq);
          const creatorSupport = ss.docs.filter((d) => d.data().creatorId === username);
          setIsSupporter(creatorSupport.length > 0);
          let total = 0;
          creatorSupport.forEach((d) => {
            total += Number(d.data().amount || 0);
          });
          setUserTotalSupport(total);

          const entriesRef = collection(db, "giveawayEntries");
          const eq = query(entriesRef, where("participantId", "==", currentUser.uid));
          const es = await getDocs(eq);
          setParticipating(es.docs.some((d) => d.data().giveawayId === giveawayId));
        } else {
          setIsSupporter(false);
          setUserTotalSupport(0);
          setParticipating(false);
        }
      } catch (e) {
        console.error("Failed to load giveaway", e);
        toast.error("Failed to load giveaway");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [username, giveawayId, currentUser?.uid, refreshKey]);

  const canAccess = (g: Giveaway) => {
    if (g.access === "public") return true;
    if (!isSupporter) return false;
    if (g.access === "supporters") return true;
    if (g.access === "tier") return userTotalSupport >= (g.minSupportAmount || 0);
    return false;
  };

  const participate = async () => {
    if (!giveaway || !currentUser?.uid) {
      throw new Error("Please log in to participate");
    }
    if (!canAccess(giveaway)) {
      throw new Error("You don't meet the requirements");
    }
    if (participating) {
      return;
    }

    const existingQ = query(
      collection(db, "giveawayEntries"),
      where("participantId", "==", currentUser.uid),
    );
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.docs.some((d) => d.data().giveawayId === giveaway.id)) {
      setParticipating(true);
      return;
    }

    const participantName =
      profile?.displayName ||
      currentUser.displayName ||
      currentUser.email ||
      "Supporter";

    await addDoc(collection(db, "giveawayEntries"), {
      giveawayId: giveaway.id,
      participantId: currentUser.uid,
      participantName,
      participantEmail: currentUser.email || "",
      participantPhoto: profile?.photoURL || currentUser.photoURL || null,
      challengeCompleted: true,
      enteredAt: new Date(),
    });
    setParticipating(true);
    toast.success("You're in! Good luck!");
  };

  const shareGiveaway = () => {
    const text = `Enter to win: ${giveaway?.title} by ${creatorData?.name || username}!`;
    const url = `${window.location.origin}/${username}?tab=giveaways`;
    if (navigator.share) navigator.share({ title: giveaway?.title || "", text, url });
    else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied!");
    }
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
  const creatorName = creatorData.name || profileData?.displayName || username;
  const creatorPhotoURL = creatorData.profilePicture || profileData?.photoURL || null;

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}/giveaways`} className="flex min-h-11 items-center gap-2 text-muted-fg hover:text-fg transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Giveaways</span>
          </Link>

          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-control bg-brand-strong px-4 py-2 font-bold text-on-brand transition hover:opacity-90"
          >
            <Heart size={18} className="fill-current" />
            Support
          </button>
        </div>

        <div className="bg-surface rounded-card border border-line overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-strong to-warning p-8 text-on-brand">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-surface/20 px-3 py-1 rounded-control text-xs font-bold uppercase tracking-wider">
                {isActive ? "Active" : "Ended"}
              </span>
              <button
                type="button"
                aria-label="Share giveaway"
                onClick={shareGiveaway}
                className="min-h-11 min-w-11 flex items-center justify-center bg-surface/20 rounded-control hover:bg-white/30 transition"
              >
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
                <span className="font-bold tabular-nums">{giveaway.winners.length} / {giveaway.maxWinners} winners</span>
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
                    <span key={p.id} className="bg-surface-sunken px-3 py-1 rounded-control text-xs font-medium text-muted-fg">{p.name}</span>
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
              <button
                type="button"
                onClick={() => setShowWinners(true)}
                className="min-h-11 w-full py-3 bg-warning-bg text-warning rounded-control font-bold text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Trophy size={16} /> View All Winners
              </button>
            )}

            {isActive && (
              <div className="border-t border-line pt-6">
                {!isLoggedIn ? (
                  <Link
                    href={`/login?referral=${username}&redirect=${encodeURIComponent(pathname)}`}
                    className="flex min-h-12 items-center justify-center w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold text-center hover:opacity-90 transition"
                  >
                    Log in to Enter
                  </Link>
                ) : !accessible ? (
                  <div className="rounded-control border border-warning bg-warning-bg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm font-medium text-warning">
                      {giveaway.access === "tier"
                        ? `Requires at least ${
                            creatorData.currency
                              ? formatCurrency(giveaway.minSupportAmount || 0, creatorData.currency)
                              : (giveaway.minSupportAmount || 0).toLocaleString()
                          } in support to unlock.`
                        : "This giveaway requires supporter access."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSupportOpen(true)}
                      className="min-h-11 shrink-0 rounded-control bg-brand-strong px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
                    >
                      Support Creator
                    </button>
                  </div>
                ) : participating ? (
                  <p className="text-center text-sm text-success bg-success-bg py-3 rounded-control font-bold">You&apos;ve entered! Good luck!</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEntryOpen(true)}
                    className="min-h-12 w-full py-3 bg-brand-strong text-on-brand rounded-control font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
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

      {entryOpen && giveaway && (
        <GiveawayEntrySheet
          open
          onClose={() => setEntryOpen(false)}
          creatorName={creatorName}
          creatorPhotoURL={creatorPhotoURL}
          creatorVerified={Boolean(creatorData.verified)}
          title={giveaway.title}
          closesAt={giveaway.endDate}
          maxWinners={giveaway.maxWinners}
          rewardCount={giveaway.rewards.length}
          onConfirm={participate}
        />
      )}

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        creator={{
          uid: creatorData.uid || "",
          handle: username,
          name: creatorName,
          photoURL: creatorPhotoURL,
          verified: Boolean(creatorData.verified),
          currency: creatorData.currency,
        }}
        isLoggedIn={isLoggedIn}
        user={currentUser}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
