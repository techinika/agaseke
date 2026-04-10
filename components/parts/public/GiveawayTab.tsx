/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Gift,
  Loader,
  Clock,
  Users,
  Trophy,
  Check,
  DollarSign,
  Package,
  Percent,
  Share2,
  Lock,
  Star,
  Sparkles,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Giveaway, GiveawayEntry } from "@/types/giveaway";
import { ProtectedSection } from "./ProtectedSection";

interface GiveawayTabProps {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  isLoggedIn: boolean;
  isSupporter: boolean;
  userTotalSupport: number;
  setIsModalOpen: (open: boolean) => void;
  currentUserId?: string;
}

export const GiveawayTab = ({
  creatorId,
  creatorName,
  creatorHandle,
  isLoggedIn,
  isSupporter,
  userTotalSupport,
  setIsModalOpen,
  currentUserId,
}: GiveawayTabProps) => {
  const { user: currentUser } = useAuth();
  const [activeGiveaways, setActiveGiveaways] = useState<Giveaway[]>([]);
  const [endedGiveaways, setEndedGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState<Set<string>>(new Set());
  const [showWinners, setShowWinners] = useState<Giveaway | null>(null);

  useEffect(() => {
    const fetchGiveaways = async () => {
      try {
        const giveawaysRef = collection(db, "giveaways");

        // Fetch all giveaways for this creator
        const q = query(
          giveawaysRef,
          where("creatorId", "==", creatorId),
          orderBy("endDate", "desc"),
        );
        const snapshot = await getDocs(q);
        const giveawayData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Giveaway[];

        // Separate active and ended (with winners) giveaways
        const active: Giveaway[] = [];
        const ended: Giveaway[] = [];

        giveawayData.forEach((g) => {
          const endDate =
            g.endDate instanceof Timestamp
              ? g.endDate.toDate()
              : new Date(g.endDate as any);

          // Active = not ended OR ended but no winners yet
          if (endDate > new Date() && g.winners.length === 0) {
            active.push(g);
          }
          // Show ended giveaways only if they have winners
          if (g.winners.length > 0) {
            ended.push(g);
          }
        });

        // Sort active giveaways by end date (earliest first)
        active.sort((a, b) => {
          const aDate =
            a.endDate instanceof Timestamp
              ? a.endDate.toDate()
              : new Date(a.endDate as any);
          const bDate =
            b.endDate instanceof Timestamp
              ? b.endDate.toDate()
              : new Date(b.endDate as any);
          return aDate.getTime() - bDate.getTime();
        });

        setActiveGiveaways(active);
        setEndedGiveaways(ended);

        if (currentUser?.uid) {
          const entriesRef = collection(db, "giveawayEntries");
          const entriesQ = query(
            entriesRef,
            where("participantId", "==", currentUser.uid),
          );
          const entriesSnap = await getDocs(entriesQ);
          const participated = new Set(
            entriesSnap.docs.map((doc) => doc.data().giveawayId),
          );
          setParticipating(participated);
        }
      } catch (error) {
        console.error("Error fetching giveaways:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGiveaways();
  }, [creatorId, currentUser?.uid]);

  const getUserWonGiveaway = (giveaway: Giveaway): boolean => {
    const userId = currentUserId || currentUser?.uid;
    if (!userId) return false;
    return giveaway.winners.some((w) => w.winnerId === userId);
  };

  const isUserWinner = (
    giveaway: Giveaway,
  ): { won: boolean; reward?: string } => {
    const userId = currentUserId || currentUser?.uid;
    if (!userId) return { won: false };
    const winner = giveaway.winners.find((w) => w.winnerId === userId);
    return { won: !!winner, reward: winner?.rewardTitle };
  };

  const canAccess = (giveaway: Giveaway) => {
    if (giveaway.access === "public") return true;
    if (!isSupporter) return false;
    if (giveaway.access === "supporters") return true;
    if (giveaway.access === "tier") {
      return userTotalSupport >= (giveaway.minSupportAmount || 0);
    }
    return false;
  };

  const participate = async (giveaway: Giveaway) => {
    if (!currentUser?.uid || !currentUser?.displayName) {
      toast.error("Please log in to participate");
      return;
    }

    if (!canAccess(giveaway)) {
      toast.error("You don't meet the requirements to participate");
      return;
    }

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

      setParticipating((prev) => new Set([...prev, giveaway.id]));
      toast.success("You're in! Good luck!");
    } catch (error) {
      toast.error("Failed to participate");
    }
  };

  const shareGiveaway = (giveaway: Giveaway) => {
    const text = `Enter to win: ${giveaway.title} by ${creatorName}!`;
    const url = `${window.location.origin}/${creatorHandle}?tab=giveaways`;
    if (navigator.share) {
      navigator.share({ title: giveaway.title, text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 flex items-center justify-center h-[400px]">
        <Loader className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!isLoggedIn || !isSupporter) {
    return (
      <div className="animate-in fade-in duration-500">
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="gift"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={creatorHandle}
        />
      </div>
    );
  }

  const hasAnyGiveaways =
    activeGiveaways.length > 0 || endedGiveaways.length > 0;

  if (hasAnyGiveaways) {
    return (
      <div className="animate-in fade-in duration-500 space-y-8">
        {/* Active Giveaways */}
        {activeGiveaways.length > 0 && (
          <div className="space-y-4">
            {activeGiveaways.map((giveaway) => {
              const accessible = canAccess(giveaway);
              const hasParticipated = participating.has(giveaway.id);
              const endDate =
                giveaway.endDate instanceof Timestamp
                  ? giveaway.endDate.toDate()
                  : new Date(giveaway.endDate as any);
              const daysLeft = Math.ceil(
                (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={giveaway.id}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                          {giveaway.type === "random"
                            ? "Lucky Draw"
                            : "Challenge"}
                        </span>
                        <span className="bg-green-500/80 px-2 py-1 rounded-full text-xs font-bold">
                          Active
                        </span>
                      </div>
                      <button
                        onClick={() => shareGiveaway(giveaway)}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
                    <p className="text-white/80 text-sm">
                      {giveaway.description}
                    </p>

                    {giveaway.partners.length > 0 && (
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className="text-xs text-white/60">
                          Sponsored by:
                        </span>
                        {giveaway.partners.map((partner: any) => (
                          <div
                            key={partner.id}
                            className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full"
                          >
                            {partner.logo && (
                              <img
                                src={partner.logo}
                                alt={partner.name}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            )}
                            <span className="text-xs font-medium">
                              {partner.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <Clock
                          size={20}
                          className="mx-auto text-orange-600 mb-1"
                        />
                        <p className="text-xs text-slate-500">Time Left</p>
                        <p className="font-bold">{daysLeft} days</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <Users
                          size={20}
                          className="mx-auto text-orange-600 mb-1"
                        />
                        <p className="text-xs text-slate-500">Winners</p>
                        <p className="font-bold">{giveaway.maxWinners}</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-xl">
                        <Trophy
                          size={20}
                          className="mx-auto text-orange-600 mb-1"
                        />
                        <p className="text-xs text-slate-500">Prizes</p>
                        <p className="font-bold">{giveaway.rewards.length}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        Prizes
                      </p>
                      {giveaway.rewards.map((reward: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                        >
                          <div
                            className={`p-2 rounded-lg ${
                              reward.type === "cash"
                                ? "bg-green-100 text-green-600"
                                : reward.type === "merchandise"
                                  ? "bg-blue-100 text-blue-600"
                                  : reward.type === "discount"
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-amber-100 text-amber-600"
                            }`}
                          >
                            {reward.type === "cash" && <DollarSign size={18} />}
                            {reward.type === "merchandise" && (
                              <Package size={18} />
                            )}
                            {reward.type === "discount" && (
                              <Percent size={18} />
                            )}
                            {(reward.type === "service" ||
                              reward.type === "other") && <Gift size={18} />}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{reward.title}</p>
                            <p className="text-xs text-slate-500">
                              Quantity: {reward.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!accessible ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                        <Lock size={20} className="text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-800">
                            Restricted Access
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            {giveaway.access === "supporters"
                              ? "This giveaway is only for supporters."
                              : `You need to support with at least ${giveaway.minSupportAmount?.toLocaleString()} RWF to participate.`}
                          </p>
                        </div>
                      </div>
                    ) : hasParticipated ? (
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-full">
                          <Check size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-green-800">
                            You are Entered!
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Good luck! Winners will be announced soon.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => participate(giveaway)}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:opacity-90 transition shadow-lg"
                      >
                        Enter Giveaway
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ended Giveaways with Winners */}
        {endedGiveaways.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-orange-500" />
              <h3 className="text-lg font-bold">Past Giveaways</h3>
            </div>

            {endedGiveaways.map((giveaway) => {
              const { won, reward } = isUserWinner(giveaway);

              return (
                <div
                  key={giveaway.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                          {giveaway.type === "random"
                            ? "Lucky Draw"
                            : "Challenge"}
                        </span>
                        <span className="bg-slate-500/80 px-2 py-1 rounded-full text-xs font-bold">
                          Ended
                        </span>
                      </div>
                      <button
                        onClick={() => setShowWinners(giveaway)}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
                      >
                        <Trophy size={18} />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
                    <p className="text-white/80 text-sm">
                      {giveaway.description}
                    </p>

                    {giveaway.partners.length > 0 && (
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className="text-xs text-white/60">
                          Sponsored by:
                        </span>
                        {giveaway.partners.map((partner: any) => (
                          <div
                            key={partner.id}
                            className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full"
                          >
                            {partner.logo && (
                              <img
                                src={partner.logo}
                                alt={partner.name}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            )}
                            <span className="text-xs font-medium">
                              {partner.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {won ? (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Sparkles size={32} className="text-white" />
                        </div>
                        <h4 className="text-xl font-bold text-green-800 mb-2">
                          Congratulations!
                        </h4>
                        <p className="text-green-700">
                          You won <span className="font-bold">{reward}</span>!
                        </p>
                        <button
                          onClick={() => setShowWinners(giveaway)}
                          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
                        >
                          View All Winners
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-600 mb-4">
                          <Trophy size={20} className="text-orange-500" />
                          <span className="font-bold">
                            {giveaway.winners.length} Winner
                            {giveaway.winners.length !== 1 ? "s" : ""} Announced
                          </span>
                        </div>
                        <div className="space-y-2">
                          {giveaway.winners
                            .slice(0, 3)
                            .map((winner: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"
                              >
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                                  {winner.winnerPhoto ? (
                                    <img
                                      src={winner.winnerPhoto}
                                      alt={winner.winnerName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    winner.winnerName?.[0]?.toUpperCase() || "?"
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-sm">
                                    {winner.winnerName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Won: {winner.rewardTitle}
                                  </p>
                                </div>
                                {idx === 0 && (
                                  <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full">
                                    1st
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                        {giveaway.winners.length > 3 && (
                          <button
                            onClick={() => setShowWinners(giveaway)}
                            className="w-full py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition"
                          >
                            View All {giveaway.winners.length} Winners
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showWinners && (
          <WinnersModal
            giveaway={showWinners}
            onClose={() => setShowWinners(null)}
            isWinner={isUserWinner(showWinners).won}
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
        <Gift size={48} className="mx-auto text-slate-200 mb-4" />
        <h3 className="text-2xl font-bold">No Giveaways Yet</h3>
        <p className="text-slate-500 mt-2">
          Check back later for exciting prizes!
        </p>
      </div>
    </div>
  );
};

function WinnersModal({
  giveaway,
  onClose,
  isWinner,
}: {
  giveaway: Giveaway;
  onClose: () => void;
  isWinner?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-orange-600 to-amber-600">
          <h2 className="text-xl font-bold text-white">{giveaway.title}</h2>
          <p className="text-white/80 text-sm mt-1">Winners Announced!</p>
          {giveaway.partners.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-white/60">Sponsored by:</span>
              {giveaway.partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full"
                >
                  {partner.logo && (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span className="text-xs font-medium text-white">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {giveaway.winners.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No winners yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaway.winners.map((winner, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    idx === 0
                      ? "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300"
                      : "bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      idx === 0
                        ? "bg-orange-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {winner.winnerPhoto ? (
                      <img
                        src={winner.winnerPhoto}
                        alt={winner.winnerName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      winner.winnerName?.[0] || "?"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{winner.winnerName}</p>
                    <p className="text-xs text-slate-500">
                      Won: {winner.rewardTitle}
                    </p>
                  </div>
                  {idx === 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      1st
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
