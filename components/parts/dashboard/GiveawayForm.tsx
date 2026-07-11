"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader,
  Check,
  Gift,
  DollarSign,
  Package,
  Percent,
  Building,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Giveaway,
  GiveawayReward,
  GiveawayPartner,
  GiveawayType,
  GiveawayAccess,
  RewardType,
} from "@/types/giveaway";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function GiveawayForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [existingPartners, setExistingPartners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "random" as GiveawayType,
    access: "public" as GiveawayAccess,
    minSupportAmount: 0,
    maxWinners: 1,
    rewards: [
      {
        id: "1",
        type: "cash" as RewardType,
        title: "",
        description: "",
        value: 0,
        quantity: 1,
      },
    ],
    partners: [] as GiveawayPartner[],
    daysUntilEnd: 7,
  });
  const [saving, setSaving] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "",
    website: "",
    description: "",
  });
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  useEffect(() => {
    const fetchExistingPartners = async () => {
      if (!creator?.uid) return;
      try {
        const partnersRef = collection(db, "creatorPartners");
        const q = query(partnersRef, where("creatorId", "==", creator.uid));
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
  }, [creator?.uid]);

  const rewardTypes: { value: RewardType; label: string; icon: any }[] = [
    { value: "cash", label: "Cash", icon: DollarSign },
    { value: "merchandise", label: "Merchandise", icon: Package },
    { value: "discount", label: "Discount", icon: Percent },
    { value: "service", label: "Service", icon: Building },
    { value: "other", label: "Other", icon: Gift },
  ];

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
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
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + formData.daysUntilEnd);

      const giveawayData: Record<string, any> = {
        creatorId: creator.uid,
        creatorName: creator.name,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        access: formData.access,
        minSupportAmount: formData.minSupportAmount,
        endDate,
        maxWinners: formData.maxWinners,
        rewards: rewards.map((r, idx) => ({ ...r, id: String(idx + 1) })),
        partners: formData.partners,
        startDate: serverTimestamp(),
        status: "draft",
        winners: [],
        participantCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "giveaways"), giveawayData);
      toast.success("Giveaway created!");
      router.push("/creator/giveaways");
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
      rewards: prev.rewards.map((r, i) =>
        i === idx ? { ...r, [field]: value } : r,
      ),
    }));
  };

  const addReward = () => {
    setFormData((prev) => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        {
          id: String(prev.rewards.length + 1),
          type: "cash" as RewardType,
          title: "",
          description: "",
          value: 0,
          quantity: 1,
        },
      ],
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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/creator/giveaways")}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            New Giveaway
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Win a year's gym membership!"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-muted p-4 rounded-lg text-sm outline-none resize-none h-24"
              placeholder="Tell people about this amazing opportunity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as GiveawayType,
                  }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none"
              >
                <option value="random">Random Draw</option>
                <option value="challenge">Challenge Based</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Access
              </label>
              <select
                value={formData.access}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    access: e.target.value as GiveawayAccess,
                  }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none"
              >
                <option value="public">Public (Everyone)</option>
                <option value="supporters">Supporters Only</option>
                <option value="tier">Supporters (Min Amount)</option>
              </select>
            </div>
          </div>

          {formData.access === "tier" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Minimum Support (RWF)
              </label>
              <input
                type="number"
                value={formData.minSupportAmount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minSupportAmount: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none"
                placeholder="5000"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Max Winners
              </label>
              <input
                type="number"
                value={formData.maxWinners}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxWinners: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none"
                min={1}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Duration
              </label>
              <select
                value={formData.daysUntilEnd}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    daysUntilEnd: parseInt(e.target.value),
                  }))
                }
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none"
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
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Rewards
              </label>
              <button
                onClick={addReward}
                className="text-orange-600 text-xs font-bold hover:text-orange-700"
              >
                + Add Reward
              </button>
            </div>
            <div className="space-y-3">
              {formData.rewards.map((reward, idx) => (
                <div key={idx} className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Reward #{idx + 1}</span>
                    {formData.rewards.length > 1 && (
                      <button
                        onClick={() => removeReward(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={reward.type}
                      onChange={(e) =>
                        updateReward(idx, "type", e.target.value)
                      }
                      className="bg-card p-3 rounded-lg text-sm outline-none"
                    >
                      {rewardTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={reward.quantity}
                      onChange={(e) =>
                        updateReward(
                          idx,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="bg-card p-3 rounded-lg text-sm outline-none w-20"
                      placeholder="Qty"
                      min={1}
                    />
                  </div>
                  <input
                    type="text"
                    value={reward.title}
                    onChange={(e) => updateReward(idx, "title", e.target.value)}
                    className="w-full bg-card p-3 rounded-lg text-sm outline-none"
                    placeholder="Reward title (e.g., $100 Gift Card)"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                Partners / Sponsors
              </label>
              <button
                onClick={() => setShowPartnerForm(!showPartnerForm)}
                className="text-orange-600 text-xs font-bold hover:text-orange-700"
              >
                {showPartnerForm ? "- Cancel" : "+ Create New Partner"}
              </button>
            </div>

            {existingPartners.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Select from your partners:
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingPartners.map((partner) => {
                    const isAdded = formData.partners.some(
                      (p) => p.id === partner.id,
                    );
                    return (
                      <button
                        key={partner.id}
                        onClick={() => !isAdded && addExistingPartner(partner)}
                        disabled={isAdded}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition ${
                          isAdded
                            ? "bg-orange-100 text-orange-400 cursor-not-allowed"
                            : "bg-border text-muted-foreground hover:bg-orange-50 hover:text-orange-600"
                        }`}
                      >
                        {partner.logo && (
                          <img
                            src={partner.logo}
                            alt={partner.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
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
                  <div
                    key={partner.id}
                    className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full"
                  >
                    {partner.logo && (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm font-medium">{partner.name}</span>
                    <button
                      onClick={() => removePartner(partner.id)}
                      className="text-orange-400 hover:text-orange-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showPartnerForm && (
              <form
                onSubmit={addPartner}
                className="bg-muted p-4 rounded-lg space-y-3"
              >
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) =>
                    setNewPartner((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-card p-3 rounded-lg text-sm outline-none"
                  placeholder="Partner name (e.g., Gym Master)"
                  required
                />
                <input
                  type="url"
                  value={newPartner.website}
                  onChange={(e) =>
                    setNewPartner((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  className="w-full bg-card p-3 rounded-lg text-sm outline-none"
                  placeholder="Website URL (optional)"
                />
                <textarea
                  value={newPartner.description}
                  onChange={(e) =>
                    setNewPartner((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-card p-3 rounded-lg text-sm outline-none resize-none h-20"
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

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/giveaways")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.title}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Create Giveaway"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
