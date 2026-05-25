/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  ArrowLeft,
  Loader,
  Users,
  Trophy,
  Clock,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import {
  Giveaway,
  GiveawayReward,
  GiveawayPartner,
  GiveawayEntry,
  GiveawayType,
  GiveawayAccess,
  RewardType,
} from "@/types/giveaway";
import SpinningWheel from "./SpinningWheel";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  GiveawayDetail,
  WinnersModal,
  GiveawayModal,
} from "./giveawayspage/index";

export default function GiveawaysPage() {
  const { creator } = useAuth();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [entries, setEntries] = useState<Record<string, GiveawayEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(
    null,
  );
  const [showWinners, setShowWinners] = useState(false);
  const [showSpinningWheel, setShowSpinningWheel] = useState<Giveaway | null>(
    null,
  );
  const [deleteGiveawayId, setDeleteGiveawayId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!creator?.uid) return;

    const giveawaysRef = collection(db, "giveaways");
    const q = query(
      giveawaysRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const giveawayData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Giveaway[];

      setGiveaways(giveawayData);

      if (selectedGiveaway) {
        const updated = giveawayData.find((g) => g.id === selectedGiveaway.id);
        if (updated) {
          setSelectedGiveaway(updated);
        }
      }

      const entriesData: Record<string, GiveawayEntry[]> = {};
      for (const giveaway of giveawayData) {
        try {
          const entriesRef = collection(db, "giveawayEntries");
          const entriesQ = query(
            entriesRef,
            where("giveawayId", "==", giveaway.id),
          );
          const entriesSnap = await getDocs(entriesQ);
          entriesData[giveaway.id] = entriesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as GiveawayEntry[];
        } catch (e) {
          console.error("Error fetching entries for", giveaway.id, e);
          entriesData[giveaway.id] = [];
        }
      }
      setEntries(entriesData);
      setLoading(false);
    });

    return () => unsub();
  }, [creator?.uid]);

  const handleDelete = async () => {
    if (!deleteGiveawayId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "giveaways", deleteGiveawayId));
      toast.success("Giveaway deleted");
      setSelectedGiveaway(null);
      setDeleteGiveawayId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteGiveaway = (id: string) => {
    setDeleteGiveawayId(id);
  };

  const pickWinners = async (giveaway: Giveaway) => {
    const giveawayEntries = entries[giveaway.id] || [];
    if (giveawayEntries.length === 0) {
      toast.error("No participants to pick from");
      return;
    }

    if (giveaway.type === "random") {
      setShowSpinningWheel(giveaway);
    } else {
      await selectWinners(giveaway, giveawayEntries);
    }
  };

  const selectWinners = async (
    giveaway: Giveaway,
    giveawayEntries: GiveawayEntry[],
  ) => {
    const shuffled = [...giveawayEntries].sort(() => Math.random() - 0.5);
    const numWinners = Math.min(
      giveaway.maxWinners,
      shuffled.length,
      giveawayEntries.length,
    );
    const selected = shuffled.slice(0, numWinners);

    const winners = selected.map((entry, idx) => ({
      winnerId: entry.participantId,
      winnerName: entry.participantName,
      winnerPhoto: entry.participantPhoto || undefined,
      winnerEmail: entry.participantEmail || undefined,
      rewardId: giveaway.rewards[idx % giveaway.rewards.length]?.id || "",
      rewardTitle:
        giveaway.rewards[idx % giveaway.rewards.length]?.title || "Prize",
      wonAt: new Date(),
    }));

    try {
      await updateDoc(doc(db, "giveaways", giveaway.id), {
        winners: winners,
        status: "completed",
        updatedAt: serverTimestamp(),
      });
      toast.success(`${winners.length} winners selected!`);
      setShowWinners(true);
    } catch (error) {
      console.error("Pick winners error:", error);
      toast.error("Failed to pick winners. Please try again.");
    }
  };

  const handleWheelComplete = async (
    winners: Array<{ id: string; name: string; photo?: string }>,
    giveaway: Giveaway,
    allEntries: GiveawayEntry[],
  ) => {
    const winnerData = winners.map((winner, idx) => {
      const entry = allEntries.find((e) => e.participantId === winner.id);
      return {
        winnerId: winner.id,
        winnerName: winner.name,
        winnerPhoto: winner.photo || undefined,
        winnerEmail: entry?.participantEmail || undefined,
        rewardId: giveaway.rewards[idx % giveaway.rewards.length]?.id || "",
        rewardTitle:
          giveaway.rewards[idx % giveaway.rewards.length]?.title || "Prize",
        wonAt: new Date(),
      };
    });

    try {
      await updateDoc(doc(db, "giveaways", giveaway.id), {
        winners: winnerData,
        status: "completed",
        updatedAt: serverTimestamp(),
      });
      toast.success(`${winners.length} winners selected!`);
      setShowSpinningWheel(null);
      setShowWinners(true);
    } catch (error) {
      console.error("Save winners error:", error);
      toast.error("Failed to save winners");
    }
  };

  const endGiveaway = async (giveaway: Giveaway) => {
    try {
      await updateDoc(doc(db, "giveaways", giveaway.id), {
        status: "ended",
        updatedAt: serverTimestamp(),
      });
      toast.success("Giveaway ended");
    } catch (error) {
      console.error("End error:", error);
      toast.error("Failed to end giveaway");
    }
  };

  const activateGiveaway = async (giveaway: Giveaway) => {
    try {
      await updateDoc(doc(db, "giveaways", giveaway.id), {
        status: "active",
        updatedAt: serverTimestamp(),
      });
      toast.success("Giveaway activated!");
    } catch (error) {
      console.error("Activate error:", error);
      toast.error("Failed to activate");
    }
  };

  const copyShareLink = (giveawayId: string) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${creator?.handle}?giveaway=${giveawayId}`,
    );
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <aside className="w-full bg-white border-b border-slate-200 hidden md:flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-xl font-bold uppercase">Giveaways</h1>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
        >
          <Plus size={18} /> New Giveaway
        </button>
      </aside>

      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                All Giveaways ({giveaways.length})
              </h3>
            </div>

            {giveaways.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
                <Gift size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">No giveaways yet</p>
                <p className="text-slate-400 text-sm mt-2">
                  Create your first giveaway to engage your audience
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-4 bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition"
                >
                  Create Giveaway
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {giveaways.map((giveaway) => {
                  const isActive = giveaway.status === "active";
                  const isEnded =
                    giveaway.status === "ended" ||
                    giveaway.status === "completed";
                  const endDate =
                    giveaway.endDate instanceof Timestamp
                      ? giveaway.endDate.toDate()
                      : new Date(giveaway.endDate as any);
                  const isExpired = endDate < new Date();

                  return (
                    <div
                      key={giveaway.id}
                      onClick={() => setSelectedGiveaway(giveaway)}
                      className={`bg-white rounded-xl border p-6 cursor-pointer transition-all ${
                        selectedGiveaway?.id === giveaway.id
                          ? "border-orange-500 shadow-lg"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-3 rounded-lg ${isActive ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"}`}
                          >
                            <Gift size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold">{giveaway.title}</h4>
                            <p className="text-xs text-slate-500">
                              {isActive
                                ? "Active"
                                : isEnded
                                  ? "Ended"
                                  : isExpired
                                    ? "Expired"
                                    : "Draft"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            giveaway.type === "random"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {giveaway.type === "random"
                            ? "Lucky Draw"
                            : "Challenge"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {giveaway.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users size={14} />{" "}
                          {entries[giveaway.id]?.length || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={14} /> {giveaway.winners.length}/
                          {giveaway.maxWinners} winners
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> Ends{" "}
                          {endDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {selectedGiveaway ? (
              <GiveawayDetail
                giveaway={selectedGiveaway}
                entries={entries[selectedGiveaway.id] || []}
                onEdit={() => setEditingGiveaway(selectedGiveaway)}
                onDelete={() => confirmDeleteGiveaway(selectedGiveaway.id)}
                onPickWinners={() => pickWinners(selectedGiveaway)}
                onEnd={() => endGiveaway(selectedGiveaway)}
                onActivate={() => activateGiveaway(selectedGiveaway)}
                onCopyLink={() => copyShareLink(selectedGiveaway.id)}
                onShowWinners={() => setShowWinners(true)}
                creatorHandle={creator?.handle || ""}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">Select a giveaway</p>
                <p className="text-slate-400 text-sm mt-2">
                  Click on a giveaway to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {(isCreating || editingGiveaway) && (
        <GiveawayModal
          giveaway={editingGiveaway}
          creatorId={creator?.uid || ""}
          creatorName={creator?.name || ""}
          onClose={() => {
            setIsCreating(false);
            setEditingGiveaway(null);
          }}
        />
      )}

      {showWinners && selectedGiveaway && (
        <WinnersModal
          giveaway={selectedGiveaway}
          onClose={() => setShowWinners(false)}
        />
      )}

      {showSpinningWheel && entries[showSpinningWheel.id] && (
        <SpinningWheel
          participants={entries[showSpinningWheel.id].map((entry) => ({
            id: entry.participantId,
            name: entry.participantName,
            photo: entry.participantPhoto,
          }))}
          numberOfWinners={showSpinningWheel.maxWinners}
          onComplete={(winners) =>
            handleWheelComplete(
              winners,
              showSpinningWheel,
              entries[showSpinningWheel.id] || [],
            )
          }
          onClose={() => setShowSpinningWheel(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteGiveawayId !== null}
        onClose={() => setDeleteGiveawayId(null)}
        onConfirm={handleDelete}
        title="Delete Giveaway?"
        message="This will permanently delete this giveaway and remove all entries. This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}


