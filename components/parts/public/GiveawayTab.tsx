/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Gift, Loader, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
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
import { ProtectedSection } from "./ProtectedSection";
import {
  WinnersModal,
  ActiveGiveawayCard,
  EndedGiveawayCard,
} from "./giveaway";
import type { Giveaway } from "./giveaway";

function logErrorToServer(message: string, metadata?: Record<string, unknown>) {
  fetch("/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "error", category: "giveaway", message, metadata }),
  }).catch(() => {});
}

interface GiveawayTabProps {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  isLoggedIn: boolean;
  isSupporter: boolean;
  userTotalSupport: number;
  setIsModalOpen: (open: boolean) => void;
  currentUserId?: string;
  compact?: boolean;
  username?: string;
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
  compact = false,
  username = "",
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

        const active: Giveaway[] = [];
        const ended: Giveaway[] = [];

        giveawayData.forEach((g) => {
          const endDate =
            g.endDate instanceof Timestamp
              ? g.endDate.toDate()
              : new Date(g.endDate as any);

          if (endDate > new Date() && g.winners.length === 0) {
            active.push(g);
          }
          if (g.winners.length > 0) {
            ended.push(g);
          }
        });

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
        logErrorToServer("Error fetching giveaways", { creatorId, error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    fetchGiveaways();
  }, [creatorId, currentUser?.uid]);

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
      console.error("Error participating:", error);
      logErrorToServer("Error participating in giveaway", {
        giveawayId: giveaway.id,
        userId: currentUser.uid,
        error: String(error),
      });
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

  const isUserWinner = (
    giveaway: Giveaway,
  ): { won: boolean; reward?: string } => {
    const userId = currentUserId || currentUser?.uid;
    if (!userId) return { won: false };
    const winner = giveaway.winners.find((w) => w.winnerId === userId);
    return { won: !!winner, reward: winner?.rewardTitle };
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

  const displayActiveGiveaways = compact ? activeGiveaways.slice(0, 2) : activeGiveaways;
  const displayEndedGiveaways = compact ? endedGiveaways.slice(0, 2) : endedGiveaways;
  const hasMoreGiveaways = compact && (activeGiveaways.length > 2 || endedGiveaways.length > 2);

  if (!hasAnyGiveaways) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="text-center py-20 bg-card border border-border rounded-3xl">
          <Gift size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-2xl font-bold">No Giveaways Yet</h3>
          <p className="text-muted-foreground mt-2">
            Check back later for exciting prizes!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {displayActiveGiveaways.length > 0 && (
        <div className="space-y-4">
          {displayActiveGiveaways.map((giveaway) => {
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
              <ActiveGiveawayCard
                key={giveaway.id}
                giveaway={giveaway}
                accessible={accessible}
                hasParticipated={hasParticipated}
                daysLeft={daysLeft}
                onParticipate={() => participate(giveaway)}
                onShare={() => shareGiveaway(giveaway)}
                creatorHandle={creatorHandle}
              />
            );
          })}
        </div>
      )}

      {displayEndedGiveaways.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-orange-500" />
            <h3 className="text-lg font-bold">Past Giveaways</h3>
          </div>

          {displayEndedGiveaways.map((giveaway) => {
            const { won, reward } = isUserWinner(giveaway);

            return (
              <EndedGiveawayCard
                key={giveaway.id}
                giveaway={giveaway}
                won={won}
                reward={reward}
                onViewWinners={() => setShowWinners(giveaway)}
                creatorHandle={creatorHandle}
              />
            );
          })}
        </div>
      )}

      {hasMoreGiveaways && (
        <div className="text-center">
          <Link
            href={`/${username}/giveaways`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition shadow-lg"
          >
            See All Giveaways <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {showWinners && (
        <WinnersModal
          giveaway={showWinners}
          onClose={() => setShowWinners(null)}
        />
      )}
    </div>
  );
};
