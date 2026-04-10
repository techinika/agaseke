/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  ArrowLeft,
  Loader,
  X,
  Users,
  Trophy,
  Clock,
  DollarSign,
  Package,
  Percent,
  Building,
  Edit,
  Check,
  Copy,
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
import { Giveaway, GiveawayReward, GiveawayPartner, GiveawayEntry, GiveawayType, GiveawayAccess, RewardType } from "@/types/giveaway";
import SpinningWheel from "./SpinningWheel";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function GiveawaysPage() {
  const { creator } = useAuth();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [entries, setEntries] = useState<Record<string, GiveawayEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);
  const [showWinners, setShowWinners] = useState(false);
  const [showSpinningWheel, setShowSpinningWheel] = useState<Giveaway | null>(null);
  const [deleteGiveawayId, setDeleteGiveawayId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!creator?.uid) return;

    const giveawaysRef = collection(db, "giveaways");
    const q = query(
      giveawaysRef,
      where("creatorId", "==", creator.handle),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const giveawayData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Giveaway[];

      setGiveaways(giveawayData);

      // Update selected giveaway if it changed
      if (selectedGiveaway) {
        const updated = giveawayData.find(g => g.id === selectedGiveaway.id);
        if (updated) {
          setSelectedGiveaway(updated);
        }
      }

      const entriesData: Record<string, GiveawayEntry[]> = {};
      for (const giveaway of giveawayData) {
        try {
          const entriesRef = collection(db, "giveawayEntries");
          const entriesQ = query(entriesRef, where("giveawayId", "==", giveaway.id));
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

  const selectWinners = async (giveaway: Giveaway, giveawayEntries: GiveawayEntry[]) => {
    const shuffled = [...giveawayEntries].sort(() => Math.random() - 0.5);
    const numWinners = Math.min(giveaway.maxWinners, shuffled.length, giveawayEntries.length);
    const selected = shuffled.slice(0, numWinners);

    const winners = selected.map((entry, idx) => ({
      winnerId: entry.participantId,
      winnerName: entry.participantName,
      winnerPhoto: entry.participantPhoto || undefined,
      winnerEmail: entry.participantEmail || undefined,
      rewardId: giveaway.rewards[idx % giveaway.rewards.length]?.id || "",
      rewardTitle: giveaway.rewards[idx % giveaway.rewards.length]?.title || "Prize",
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

  const handleWheelComplete = async (winners: Array<{ id: string; name: string; photo?: string }>, giveaway: Giveaway, allEntries: GiveawayEntry[]) => {
    const winnerData = winners.map((winner, idx) => {
      const entry = allEntries.find(e => e.participantId === winner.id);
      return {
        winnerId: winner.id,
        winnerName: winner.name,
        winnerPhoto: winner.photo || undefined,
        winnerEmail: entry?.participantEmail || undefined,
        rewardId: giveaway.rewards[idx % giveaway.rewards.length]?.id || "",
        rewardTitle: giveaway.rewards[idx % giveaway.rewards.length]?.title || "Prize",
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
    navigator.clipboard.writeText(`${window.location.origin}/${creator?.handle}?giveaway=${giveawayId}`);
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
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-bold mb-6 uppercase">Giveaways</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
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
                <p className="text-slate-400 text-sm mt-2">Create your first giveaway to engage your audience</p>
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
                  const isEnded = giveaway.status === "ended" || giveaway.status === "completed";
                  const endDate = giveaway.endDate instanceof Timestamp 
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
                          <div className={`p-3 rounded-lg ${isActive ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"}`}>
                            <Gift size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold">{giveaway.title}</h4>
                            <p className="text-xs text-slate-500">
                              {isActive ? "Active" : isEnded ? "Ended" : isExpired ? "Expired" : "Draft"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          giveaway.type === "random" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {giveaway.type === "random" ? "Lucky Draw" : "Challenge"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{giveaway.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users size={14} /> {entries[giveaway.id]?.length || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={14} /> {giveaway.winners.length}/{giveaway.maxWinners} winners
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> Ends {endDate.toLocaleDateString()}
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
                <p className="text-slate-400 text-sm mt-2">Click on a giveaway to view details</p>
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
          onComplete={(winners) => handleWheelComplete(winners, showSpinningWheel, entries[showSpinningWheel.id] || [])}
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

function GiveawayDetail({
  giveaway,
  entries,
  onEdit,
  onDelete,
  onPickWinners,
  onEnd,
  onActivate,
  onCopyLink,
  onShowWinners,
  creatorHandle,
}: {
  giveaway: Giveaway;
  entries: GiveawayEntry[];
  onEdit: () => void;
  onDelete: () => void;
  onPickWinners: () => void;
  onEnd: () => void;
  onActivate: () => void;
  onCopyLink: () => void;
  onShowWinners: () => void;
  creatorHandle: string;
}) {
  const isActive = giveaway.status === "active";
  const isEnded = giveaway.status === "ended" || giveaway.status === "completed";
  const hasWinners = giveaway.winners.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 sticky top-8">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-lg">{giveaway.title}</h3>
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-600">
          <Edit size={18} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Participants</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Winners</p>
            <p className="text-2xl font-bold">{giveaway.winners.length}/{giveaway.maxWinners}</p>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-[10px] font-bold text-orange-400 uppercase mb-2">Access</p>
          <p className="font-bold text-orange-800">
            {giveaway.access === "public" ? "Public" : giveaway.access === "supporters" ? "Supporters Only" : `Supporters (${giveaway.minSupportAmount}+ RWF)`}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Rewards</p>
          {giveaway.rewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-2 text-sm">
              {reward.type === "cash" && <DollarSign size={14} className="text-green-600" />}
              {reward.type === "merchandise" && <Package size={14} className="text-blue-600" />}
              {reward.type === "discount" && <Percent size={14} className="text-purple-600" />}
              {reward.type === "service" && <Building size={14} className="text-amber-600" />}
              <span>{reward.quantity}x {reward.title}</span>
            </div>
          ))}
        </div>

        {giveaway.partners.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Partners</p>
            <div className="flex flex-wrap gap-2">
              {giveaway.partners.map((partner) => (
                <div key={partner.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium">
                  {partner.logo && (
                    <img src={partner.logo} alt={partner.name} className="w-4 h-4 rounded-full object-cover" />
                  )}
                  <span>{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={onCopyLink}
          className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
        >
          <Copy size={16} /> Share Link
        </button>

        {isEnded && hasWinners && (
          <button
            onClick={onShowWinners}
            className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition flex items-center justify-center gap-2"
          >
            <Trophy size={16} /> View Winners
          </button>
        )}

        {!isEnded && !isActive && (
          <button
            onClick={onActivate}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition"
          >
            Activate Giveaway
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={onPickWinners}
              disabled={entries.length === 0}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition disabled:opacity-50"
            >
              Pick Winners
            </button>
            <button
              onClick={onEnd}
              className="w-full py-3 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition"
            >
              End Now
            </button>
          </>
        )}

        <button
          onClick={onDelete}
          className="w-full py-3 border border-red-100 text-red-500 rounded-lg font-bold text-sm hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function WinnersModal({
  giveaway,
  onClose,
}: {
  giveaway: Giveaway;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Winners</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {giveaway.winners.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No winners selected yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaway.winners.map((winner, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold">
                    {winner.winnerPhoto ? (
                      <img src={winner.winnerPhoto} alt={winner.winnerName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Trophy size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{winner.winnerName}</p>
                    <p className="text-xs text-slate-500">Won: {winner.rewardTitle}</p>
                  </div>
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GiveawayModal({
  giveaway,
  creatorId,
  creatorName,
  onClose,
}: {
  giveaway: Giveaway | null;
  creatorId: string;
  creatorName: string;
  onClose: () => void;
}) {
  const [existingPartners, setExistingPartners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: giveaway?.title || "",
    description: giveaway?.description || "",
    type: giveaway?.type || "random" as GiveawayType,
    access: giveaway?.access || "public" as GiveawayAccess,
    minSupportAmount: giveaway?.minSupportAmount || 0,
    maxWinners: giveaway?.maxWinners || 1,
    rewards: giveaway?.rewards || [{ id: "1", type: "cash" as RewardType, title: "", description: "", value: 0, quantity: 1 }],
    partners: giveaway?.partners || [] as GiveawayPartner[],
    daysUntilEnd: 7,
  });
  const [saving, setSaving] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: "", website: "", description: "" });
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchExistingPartners = async () => {
      try {
        const partnersRef = collection(db, "creatorPartners");
        const q = query(partnersRef, where("creatorId", "==", creatorId));
        const snapshot = await getDocs(q);
        const partnersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExistingPartners(partnersData);
      } catch (error) {
        console.error("Error fetching partners:", error);
      }
    };

    fetchExistingPartners();
  }, [creatorId]);

  const rewardTypes: { value: RewardType; label: string; icon: any }[] = [
    { value: "cash", label: "Cash", icon: DollarSign },
    { value: "merchandise", label: "Merchandise", icon: Package },
    { value: "discount", label: "Discount", icon: Percent },
    { value: "service", label: "Service", icon: Building },
    { value: "other", label: "Other", icon: Gift },
  ];

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }

    const rewards = formData.rewards.filter((r) => r.title);
    if (rewards.length === 0) {
      toast.error("Please add at least one reward");
      return;
    }

    setSaving(true);
    try {
      let endDate;
      if (giveaway && giveaway.endDate) {
        endDate = giveaway.endDate;
      } else {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + formData.daysUntilEnd);
      }

      const giveawayData: Record<string, any> = {
        creatorId,
        creatorName,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        access: formData.access,
        minSupportAmount: formData.minSupportAmount,
        endDate,
        maxWinners: formData.maxWinners,
        rewards: rewards.map((r, idx) => ({ ...r, id: String(idx + 1) })),
        partners: formData.partners,
        updatedAt: serverTimestamp(),
      };

      if (giveaway) {
        await updateDoc(doc(db, "giveaways", giveaway.id), giveawayData);
        toast.success("Giveaway updated!");
      } else {
        giveawayData.startDate = serverTimestamp();
        giveawayData.status = "draft";
        giveawayData.winners = [];
        giveawayData.participantCount = 0;
        giveawayData.createdAt = serverTimestamp();
        await addDoc(collection(db, "giveaways"), giveawayData);
        toast.success("Giveaway created!");
      }
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateReward = (idx: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      rewards: prev.rewards.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  };

  const addReward = () => {
    setFormData((prev) => ({
      ...prev,
      rewards: [...prev.rewards, { id: String(prev.rewards.length + 1), type: "cash" as RewardType, title: "", description: "", value: 0, quantity: 1 }],
    }));
  };

  const removeReward = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((_, i) => i !== idx),
    }));
  };

  const addPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name.trim()) {
      toast.error("Partner name is required");
      return;
    }

    const partner: GiveawayPartner = {
      id: String(Date.now()),
      name: newPartner.name.trim(),
      website: newPartner.website.trim() || undefined,
      description: newPartner.description.trim() || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      partners: [...prev.partners, partner],
    }));
    setNewPartner({ name: "", website: "", description: "" });
    setShowPartnerForm(false);
    toast.success("Partner added!");
  };

  const removePartner = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      partners: prev.partners.filter((p) => p.id !== id),
    }));
  };

  const addExistingPartner = (partner: any) => {
    const alreadyAdded = formData.partners.some((p) => p.id === partner.id);
    if (alreadyAdded) {
      toast.error("Partner already added");
      return;
    }

    const giveawayPartner: GiveawayPartner = {
      id: partner.id,
      name: partner.name,
      logo: partner.logo,
      website: partner.website,
      description: partner.description,
    };

    setFormData((prev) => ({
      ...prev,
      partners: [...prev.partners, giveawayPartner],
    }));
    toast.success(`${partner.name} added!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">
            {giveaway ? "Edit Giveaway" : "New Giveaway"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Win a year's gym membership!"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-50 p-4 rounded-lg text-sm outline-none resize-none h-24"
              placeholder="Tell people about this amazing opportunity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as GiveawayType }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none"
              >
                <option value="random">Random Draw</option>
                <option value="challenge">Challenge Based</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Access</label>
              <select
                value={formData.access}
                onChange={(e) => setFormData((prev) => ({ ...prev, access: e.target.value as GiveawayAccess }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none"
              >
                <option value="public">Public (Everyone)</option>
                <option value="supporters">Supporters Only</option>
                <option value="tier">Supporters (Min Amount)</option>
              </select>
            </div>
          </div>

          {formData.access === "tier" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Minimum Support (RWF)</label>
              <input
                type="number"
                value={formData.minSupportAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, minSupportAmount: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none"
                placeholder="5000"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Max Winners</label>
              <input
                type="number"
                value={formData.maxWinners}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxWinners: parseInt(e.target.value) || 1 }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none"
                min={1}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Duration</label>
              <select
                value={formData.daysUntilEnd}
                onChange={(e) => setFormData((prev) => ({ ...prev, daysUntilEnd: parseInt(e.target.value) }))}
                className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Rewards</label>
              <button onClick={addReward} className="text-orange-600 text-xs font-bold hover:text-orange-700">
                + Add Reward
              </button>
            </div>
            <div className="space-y-3">
              {formData.rewards.map((reward, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Reward #{idx + 1}</span>
                    {formData.rewards.length > 1 && (
                      <button onClick={() => removeReward(idx)} className="text-red-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={reward.type}
                      onChange={(e) => updateReward(idx, "type", e.target.value)}
                      className="bg-white p-3 rounded-lg text-sm outline-none"
                    >
                      {rewardTypes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={reward.quantity}
                      onChange={(e) => updateReward(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="bg-white p-3 rounded-lg text-sm outline-none w-20"
                      placeholder="Qty"
                      min={1}
                    />
                  </div>
                  <input
                    type="text"
                    value={reward.title}
                    onChange={(e) => updateReward(idx, "title", e.target.value)}
                    className="w-full bg-white p-3 rounded-lg text-sm outline-none"
                    placeholder="Reward title (e.g., $100 Gift Card)"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Partners / Sponsors</label>
              <button 
                onClick={() => setShowPartnerForm(!showPartnerForm)} 
                className="text-orange-600 text-xs font-bold hover:text-orange-700"
              >
                {showPartnerForm ? "- Cancel" : "+ Create New Partner"}
              </button>
            </div>

            {existingPartners.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-2">Select from your partners:</p>
                <div className="flex flex-wrap gap-2">
                  {existingPartners.map((partner) => {
                    const isAdded = formData.partners.some((p) => p.id === partner.id);
                    return (
                      <button
                        key={partner.id}
                        onClick={() => !isAdded && addExistingPartner(partner)}
                        disabled={isAdded}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition ${
                          isAdded 
                            ? "bg-orange-100 text-orange-400 cursor-not-allowed" 
                            : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                      >
                        {partner.logo && (
                          <img src={partner.logo} alt={partner.name} className="w-4 h-4 rounded-full object-cover" />
                        )}
                        <span>{partner.name}</span>
                        {isAdded && <span className="text-[10px]">Added</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.partners.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.partners.map((partner) => (
                  <div key={partner.id} className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full">
                    {partner.logo && (
                      <img src={partner.logo} alt={partner.name} className="w-5 h-5 rounded-full object-cover" />
                    )}
                    <span className="text-sm font-medium">{partner.name}</span>
                    <button onClick={() => removePartner(partner.id)} className="text-orange-400 hover:text-orange-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showPartnerForm && (
              <form onSubmit={addPartner} className="bg-slate-50 p-4 rounded-lg space-y-3">
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white p-3 rounded-lg text-sm outline-none"
                  placeholder="Partner name (e.g., Gym Master Rwanda)"
                  required
                />
                <input
                  type="url"
                  value={newPartner.website}
                  onChange={(e) => setNewPartner((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full bg-white p-3 rounded-lg text-sm outline-none"
                  placeholder="Website URL (optional)"
                />
                <textarea
                  value={newPartner.description}
                  onChange={(e) => setNewPartner((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white p-3 rounded-lg text-sm outline-none resize-none h-20"
                  placeholder="Description (optional)"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition"
                >
                  Add Partner
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
            {giveaway ? "Update Giveaway" : "Create Giveaway"}
          </button>
        </div>
      </div>
    </div>
  );
}
