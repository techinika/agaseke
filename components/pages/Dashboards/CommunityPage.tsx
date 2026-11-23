/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/db/firebase";
import Link from "next/link";
import {
  Users,
  DollarSign,
  Shield,
  Plus,
  X,
  Check,
  Loader,
  Crown,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveCommunityTiers,
  getCommunityMembers,
  type CommunityTier,
  type MemberInfo,
} from "@/lib/communityService";
import { formatCurrency } from "@/types/currency";
import {
  buildPriceMap,
  getPrice,
  parsePriceCurrency,
  type PriceMap,
} from "@/lib/priceMap";
import PriceEditor from "@/components/money/PriceEditor";
import type { CurrencyCode } from "@/lib/money/registry.generated";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Select,
  Tabs,
  Textarea,
} from "@/components/ui";
import { PageHeader } from "@/components/shell/PageHeader";

interface CommunitySettings {
  enabled: boolean;
  tiers: CommunityTier[];
}

function emptyTier(defaultCurrency: CurrencyCode): CommunityTier {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    description: "",
    price: 0,
    currency: defaultCurrency,
    prices: {},
    interval: "monthly",
    benefits: [],
    isActive: true,
  };
}

export default function CommunityPage() {
  const { creator } = useAuth();
  const defaultCurrency: CurrencyCode =
    parsePriceCurrency(creator?.currency) ?? ("RWF" as CurrencyCode);
  const defaultCurrencyRef = useRef(defaultCurrency);
  const [settings, setSettings] = useState<CommunitySettings>({
    enabled: false,
    tiers: [],
  });
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"settings" | "members" | "earnings">(
    "settings",
  );
  const [newBenefit, setNewBenefit] = useState<Record<string, string>>({});

  useEffect(() => {
    defaultCurrencyRef.current = defaultCurrency;
  }, [defaultCurrency]);

  useEffect(() => {
    if (!creator?.handle) return;

    const unsub = onSnapshot(doc(db, "creators", creator.handle), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const communityTiers = ((data.communityTiers || []) as CommunityTier[]).map((t) => {
        const currency = parsePriceCurrency(t.currency) || defaultCurrencyRef.current;
        const prices = buildPriceMap({ prices: t.prices as PriceMap, price: t.price, currency });
        return {
          ...t,
          currency,
          prices,
          price: getPrice({ prices, currency }, currency),
        } as CommunityTier;
      });
      setSettings({
        enabled: !!data.communityEnabled,
        tiers:
          communityTiers.length > 0
            ? communityTiers
            : [emptyTier(defaultCurrencyRef.current)],
      });
      setLoading(false);
    });

    return () => unsub();
  }, [creator?.handle]);

  useEffect(() => {
    if (!creator?.handle || !settings.enabled) return;
    getCommunityMembers(creator.handle)
      .then(setMembers)
      .catch((err) => {
        console.error("Failed to fetch community members", err);
      });
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
      tiers: [...prev.tiers, emptyTier(defaultCurrency)],
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
      const normalizedTiers = settings.tiers.map((t) => {
        const currency = parsePriceCurrency(t.currency) || defaultCurrencyRef.current;
        const prices = buildPriceMap({ prices: t.prices as PriceMap, price: t.price, currency });
        const primary = getPrice({ prices, currency }, currency);
        return {
          ...t,
          currency,
          prices,
          price: primary,
        } as CommunityTier;
      });

      if (settings.enabled) {
        const missingPriceTier = normalizedTiers.find(
          (t) => t.name.trim() && getPrice(t, t.currency as CurrencyCode) <= 0,
        );
        if (missingPriceTier) {
          toast.error(
            `Enter a valid ${missingPriceTier.currency} price for "${missingPriceTier.name.trim()}"`,
          );
          setSaving(false);
          return;
        }
      }

      const validTiers = normalizedTiers.filter(
        (t) => t.name.trim() && getPrice(t, t.currency as CurrencyCode) > 0,
      );
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
      <div className="flex min-h-[400px] items-center justify-center" role="status">
        <Loader className="size-8 animate-spin text-brand-strong" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-canvas p-4 text-fg md:p-8">
      <PageHeader
        title="Community"
        description="Create subscription tiers for your most dedicated supporters"
        className="mb-8"
        actions={
          <Button
            variant={settings.enabled ? "primary" : "secondary"}
            aria-pressed={settings.enabled}
            onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            leadingIcon={
              settings.enabled ? (
                <ToggleRight className="size-4" aria-hidden="true" />
              ) : (
                <ToggleLeft className="size-4" aria-hidden="true" />
              )
            }
          >
            {settings.enabled ? "Enabled" : "Disabled"}
          </Button>
        }
      />

      {!settings.enabled && (
        <EmptyState
          icon={<Crown className="size-6" aria-hidden="true" />}
          title="Community Subscriptions"
          description="Enable community subscriptions to offer monthly or yearly membership tiers. Supporters subscribe to get exclusive benefits and access."
          action={
            <Button onClick={() => setSettings((prev) => ({ ...prev, enabled: true }))}>
              Enable Community
            </Button>
          }
          className="py-12"
        />
      )}

      {settings.enabled && (
        <>
          <Tabs
            ariaLabel="Community sections"
            variant="segmented"
            value={activeTab}
            onChange={(id) => setActiveTab(id as "settings" | "members" | "earnings")}
            items={[
              {
                id: "settings",
                label: "Tiers",
                icon: <Shield className="size-4" aria-hidden="true" />,
              },
              {
                id: "members",
                label: "Members",
                icon: <Users className="size-4" aria-hidden="true" />,
              },
              {
                id: "earnings",
                label: "Earnings",
                icon: <DollarSign className="size-4" aria-hidden="true" />,
              },
            ]}
            className="mb-8 w-max overflow-x-auto no-scrollbar md:w-fit"
          />

          {activeTab === "settings" && (
            <div className="space-y-6">
              {settings.tiers.map((tier, idx) => (
                <Card key={tier.id} className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                      Tier {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {tier.name.trim() && (
                        <Link
                          href={`/creator/community/chat/${tier.id}`}
                          className="inline-flex items-center gap-1 text-caption font-bold text-brand-strong transition hover:text-brand-hover"
                        >
                          <MessageCircle className="size-3.5" aria-hidden="true" />
                          Chat
                        </Link>
                      )}
                      {settings.tiers.length > 1 && (
                        <IconButton
                          label="Remove tier"
                          icon={<X />}
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTier(idx)}
                          className="text-danger hover:bg-danger-bg hover:text-danger"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Name"
                      value={tier.name}
                      onChange={(e) => updateTier(idx, "name", e.target.value)}
                      placeholder="e.g. Bronze, Silver, Podcast Insiders"
                    />
                    <div className="space-y-4">
                      <div className="rounded-control border border-line bg-surface-raised/40 p-3">
                        <PriceEditor
                          currency={
                            (parsePriceCurrency(tier.currency) ||
                              defaultCurrency) as CurrencyCode
                          }
                          prices={buildPriceMap({
                            prices: tier.prices as PriceMap,
                            price: tier.price,
                            currency:
                              (parsePriceCurrency(tier.currency) ||
                                defaultCurrency) as CurrencyCode,
                          })}
                          preferredCurrencies={[defaultCurrency, "RWF", "USD"]}
                          onChange={({ currency, prices }) => {
                            const primary = getPrice({ prices, currency }, currency);
                            setSettings((prev) => {
                              const tiers = [...prev.tiers];
                              tiers[idx] = {
                                ...tiers[idx],
                                currency,
                                prices,
                                price: primary,
                              };
                              return { ...prev, tiers };
                            });
                          }}
                        />
                      </div>
                      <Select
                        label="Interval"
                        value={tier.interval}
                        onChange={(e) => updateTier(idx, "interval", e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </Select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Textarea
                      label="Description"
                      value={tier.description}
                      onChange={(e) => updateTier(idx, "description", e.target.value)}
                      placeholder="What do members get?"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-caption font-bold uppercase tracking-widest text-muted-fg">
                      Benefits
                    </label>
                    <div className="mb-2 space-y-2">
                      {(tier.benefits || []).map((benefit, bIdx) => (
                        <div
                          key={bIdx}
                          className="flex items-center gap-2 rounded-control bg-surface-raised px-3 py-2"
                        >
                          <Check
                            className="size-3.5 shrink-0 text-success"
                            aria-hidden="true"
                          />
                          <span className="flex-1 text-label">{benefit}</span>
                          <IconButton
                            label="Remove benefit"
                            icon={<X />}
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBenefit(idx, bIdx)}
                            className="hover:text-danger"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        containerClassName="flex-1"
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
                      />
                      <IconButton
                        label="Add benefit"
                        icon={<Plus />}
                        variant="primary"
                        size="sm"
                        onClick={() => addBenefit(idx)}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {settings.tiers.length < 2 && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={addTier}
                  leadingIcon={<Plus className="size-4" aria-hidden="true" />}
                  className="border-dashed py-4 text-muted-fg hover:border-brand-strong hover:text-brand-strong"
                >
                  Add Tier
                </Button>
              )}

              <Button onClick={handleSave} loading={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          {activeTab === "members" && (
            <Card className="overflow-hidden">
              {members.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-6" aria-hidden="true" />}
                  title="No members yet"
                  className="border-0 py-12"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-label">
                    <thead>
                      <tr className="border-b border-line bg-surface-sunken">
                        <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                          Member
                        </th>
                        <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                          Tier
                        </th>
                        <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                          Status
                        </th>
                        <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                          Amount
                        </th>
                        <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                          Expires
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr
                          key={m.subscriptionId}
                          className="border-b border-line last:border-0"
                        >
                          <td className="p-4">
                            <p className="font-medium">{m.userName || m.userEmail}</p>
                          </td>
                          <td className="p-4 text-muted-fg">{m.tierName}</td>
                          <td className="p-4">
                            <Badge
                              tone={
                                m.status === "active"
                                  ? "success"
                                  : m.status === "cancelled"
                                    ? "warning"
                                    : "neutral"
                              }
                              className="uppercase"
                            >
                              {m.status}
                            </Badge>
                          </td>
                          <td className="p-4 font-medium">
                            {m.currency
                              ? formatCurrency(m.amount, m.currency as any)
                              : m.amount}
                            <span className="ml-1 text-caption text-muted-fg">
                              /{m.interval === "yearly" ? "yr" : "mo"}
                            </span>
                          </td>
                          <td className="p-4 text-caption text-muted-fg">
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
            </Card>
          )}

          {activeTab === "earnings" && (
            <Card className="p-12 text-center">
              <DollarSign
                className="mx-auto mb-3 size-10 text-muted-fg"
                aria-hidden="true"
              />
              <p className="text-label text-muted-fg">
                Community earnings will appear here once subscriptions start rolling in.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
