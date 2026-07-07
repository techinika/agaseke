/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Users,
  DollarSign,
  Shield,
  Plus,
  X,
  Check,
  Loader,
  Crown,
  Calendar,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCommunityTiers,
  saveCommunityTiers,
  getCommunityMembers,
  type CommunityTier,
  type MemberInfo,
} from "@/lib/communityService";

interface CommunitySettings {
  enabled: boolean;
  tiers: CommunityTier[];
}

function emptyTier(): CommunityTier {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    description: "",
    price: 0,
    interval: "monthly",
    benefits: [],
    isActive: true,
  };
}

export default function CommunityPage() {
  const { creator } = useAuth();
  const [settings, setSettings] = useState<CommunitySettings>({
    enabled: false,
    tiers: [],
  });
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"settings" | "members" | "earnings">("settings");
  const [newBenefit, setNewBenefit] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!creator?.handle) return;

    const unsub = onSnapshot(doc(db, "creators", creator.handle), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const communityTiers = (data.communityTiers || []) as CommunityTier[];
      setSettings({
        enabled: !!data.communityEnabled,
        tiers: communityTiers.length > 0 ? communityTiers : [emptyTier()],
      });
      setLoading(false);
    });

    return () => unsub();
  }, [creator?.handle]);

  useEffect(() => {
    if (!creator?.handle || !settings.enabled) return;
    getCommunityMembers(creator.handle).then(setMembers).catch(() => {});
  }, [creator?.handle, settings.enabled]);

  const updateTier = (index: number, field: string, value: any) => {
    setSettings((prev) => {
      const tiers = [...prev.tiers];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...prev, tiers };
    });
  };

  const addTier = () => {
    if (settings.tiers.length >= 2) {
      toast.error("Maximum 2 tiers allowed");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      tiers: [...prev.tiers, emptyTier()],
    }));
  };

  const removeTier = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  const addBenefit = (tierIndex: number) => {
    const benefit = newBenefit[tierIndex]?.trim();
    if (!benefit) return;
    setSettings((prev) => {
      const tiers = [...prev.tiers];
      tiers[tierIndex] = {
        ...tiers[tierIndex],
        benefits: [...(tiers[tierIndex].benefits || []), benefit],
      };
      return { ...prev, tiers };
    });
    setNewBenefit((prev) => ({ ...prev, [tierIndex]: "" }));
  };

  const removeBenefit = (tierIndex: number, benefitIndex: number) => {
    setSettings((prev) => {
      const tiers = [...prev.tiers];
      tiers[tierIndex] = {
        ...tiers[tierIndex],
        benefits: tiers[tierIndex].benefits.filter((_, i) => i !== benefitIndex),
      };
      return { ...prev, tiers };
    });
  };

  const handleSave = async () => {
    if (!creator?.handle) return;
    setSaving(true);
    try {
      const validTiers = settings.tiers.filter((t) => t.name.trim() && t.price > 0);
      if (validTiers.length === 0 && settings.enabled) {
        toast.error("Add at least one tier with a name and price");
        setSaving(false);
        return;
      }
      await saveCommunityTiers(creator.handle, validTiers, settings.enabled);
      toast.success(settings.enabled ? "Community enabled" : "Community disabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Crown className="text-orange-500" size={28} />
            Community
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create subscription tiers for your most dedicated supporters
          </p>
        </div>
        <button
          onClick={() =>
            setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
          }
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${
            settings.enabled
              ? "bg-orange-50 border-orange-200 text-orange-700"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          {settings.enabled ? (
            <ToggleRight size={18} className="text-orange-500" />
          ) : (
            <ToggleLeft size={18} />
          )}
          {settings.enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {!settings.enabled && (
        <div className="bg-muted border border-border rounded-lg p-12 text-center">
          <Crown size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-bold mb-2">Community Subscriptions</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Enable community subscriptions to offer monthly or yearly membership
            tiers. Supporters subscribe to get exclusive benefits and access.
          </p>
          <button
            onClick={() =>
              setSettings((prev) => ({ ...prev, enabled: true }))
            }
            className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition"
          >
            Enable Community
          </button>
        </div>
      )}

      {settings.enabled && (
        <>
          <div className="flex gap-1 mb-8 bg-muted rounded-lg p-1 w-fit">
            {(["settings", "members", "earnings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-xs font-bold capitalize transition ${
                  activeTab === tab
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "settings" && <><Shield size={14} className="inline mr-1" /> Tiers</>}
                {tab === "members" && <><Users size={14} className="inline mr-1" /> Members</>}
                {tab === "earnings" && <><DollarSign size={14} className="inline mr-1" /> Earnings</>}
              </button>
            ))}
          </div>

          {activeTab === "settings" && (
            <div className="space-y-6">
              {settings.tiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Tier {idx + 1}
                    </span>
                    {settings.tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(idx)}
                        className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-1 block">
                        Name
                      </label>
                      <input
                        value={tier.name}
                        onChange={(e) => updateTier(idx, "name", e.target.value)}
                        placeholder="e.g. Bronze, Silver, Podcast Insiders"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Price
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={tier.price || ""}
                          onChange={(e) => updateTier(idx, "price", Number(e.target.value))}
                          placeholder="5000"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">
                          Interval
                        </label>
                        <select
                          value={tier.interval}
                          onChange={(e) => updateTier(idx, "interval", e.target.value)}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={tier.description}
                      onChange={(e) => updateTier(idx, "description", e.target.value)}
                      placeholder="What do members get?"
                      rows={2}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Benefits
                    </label>
                    <div className="space-y-2 mb-2">
                      {(tier.benefits || []).map((benefit, bIdx) => (
                        <div
                          key={bIdx}
                          className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
                        >
                          <Check size={14} className="text-green-500 shrink-0" />
                          <span className="text-sm flex-1">{benefit}</span>
                          <button
                            onClick={() => removeBenefit(idx, bIdx)}
                            className="text-muted-foreground hover:text-red-500 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newBenefit[idx] || ""}
                        onChange={(e) =>
                          setNewBenefit((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBenefit(idx);
                          }
                        }}
                        placeholder="Add a benefit..."
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                      />
                      <button
                        onClick={() => addBenefit(idx)}
                        className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {settings.tiers.length < 2 && (
                <button
                  onClick={addTier}
                  className="w-full py-4 border-2 border-dashed border-border rounded-lg text-sm font-bold text-muted-foreground hover:border-orange-300 hover:text-orange-600 transition"
                >
                  <Plus size={18} className="inline mr-1" /> Add Tier
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "members" && (
            <div className="bg-card border border-border rounded-lg">
              {members.length === 0 ? (
                <div className="p-12 text-center">
                  <Users size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No members yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Member</th>
                        <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Tier</th>
                        <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                        <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Amount</th>
                        <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.subscriptionId} className="border-b border-border last:border-0">
                          <td className="p-4">
                            <p className="font-medium">{m.userName || m.userEmail}</p>
                          </td>
                          <td className="p-4 text-muted-foreground">{m.tierName}</td>
                          <td className="p-4">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${
                                m.status === "active"
                                  ? "bg-green-50 text-green-700"
                                  : m.status === "cancelled"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : "bg-gray-50 text-gray-500"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="p-4 font-medium">
                            {m.amount.toLocaleString()} RWF
                            <span className="text-muted-foreground text-xs ml-1">
                              /{m.interval === "yearly" ? "yr" : "mo"}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {m.expiresAt
                              ? new Date(m.expiresAt).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "earnings" && (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <DollarSign size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Community earnings will appear here once subscriptions start rolling in.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
