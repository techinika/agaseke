/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
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
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
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

interface CommunityEarningRecord {
  id: string;
  txRef: string;
  supporterName: string;
  tierName: string;
  interval: string;
  grossAmount: number;
  netAmount: number;
  currency: string;
  paymentMethod: string;
  createdAtMs: number;
  createdAtLabel: string;
  status: string;
}

function toTimestampMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [earnings, setEarnings] = useState<CommunityEarningRecord[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
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

  const creatorHandle = creator?.handle;
  const creatorUid = creator?.uid;

  useEffect(() => {
    if (!creatorHandle || !settings.enabled) return;
    const handle = creatorHandle;
    const uid = creatorUid;
    let cancelled = false;

    async function loadCommunityData() {
      setLoadingEarnings(true);

      try {
        const [workerMembersResult, firestoreSubsResult, incomeResult, txByUidResult, txByHandleResult] =
          await Promise.allSettled([
            getCommunityMembers(handle),
            getDocs(
              query(
                collection(db, "communitySubscriptions"),
                where("creatorHandle", "==", handle),
              ),
            ),
            uid
              ? getDocs(
                  query(
                    collection(db, "creatorIncome"),
                    where("creatorUid", "==", uid),
                  ),
                )
              : Promise.resolve(null),
            uid
              ? getDocs(
                  query(
                    collection(db, "transactions"),
                    where("creatorUid", "==", uid),
                  ),
                )
              : Promise.resolve(null),
            getDocs(
              query(
                collection(db, "transactions"),
                where("creatorId", "==", handle),
              ),
            ),
          ]);

        if (cancelled) return;

        // 1. Merge members from community worker + Firestore communitySubscriptions fallback
        const memberMap = new Map<string, MemberInfo & { paymentRef?: string; lastPaymentRef?: string }>();
        const subByPaymentRef = new Map<string, Record<string, any>>();

        if (workerMembersResult.status === "fulfilled") {
          for (const m of workerMembersResult.value) {
            memberMap.set(m.subscriptionId, {
              ...m,
              currency: resolveHistoricalCurrency(m as unknown as Record<string, unknown>),
            });
          }
        }

        if (firestoreSubsResult.status === "fulfilled" && firestoreSubsResult.value) {
          for (const docSnap of firestoreSubsResult.value.docs) {
            const d = docSnap.data();
            const existing = memberMap.get(docSnap.id);
            const currency = resolveHistoricalCurrency(d);
            const merged: MemberInfo & { paymentRef?: string; lastPaymentRef?: string } = {
              subscriptionId: docSnap.id,
              userId: String(d.userId || existing?.userId || ""),
              userEmail: String(d.userEmail || existing?.userEmail || ""),
              userName: String(d.userName || existing?.userName || ""),
              tierId: String(d.tierId || existing?.tierId || ""),
              tierName: String(d.tierName || existing?.tierName || ""),
              status: String(d.status || existing?.status || "pending"),
              creatorHandle: String(d.creatorHandle || existing?.creatorHandle || handle),
              subscribedAt: String(d.subscribedAt || existing?.subscribedAt || ""),
              expiresAt: String(d.expiresAt || existing?.expiresAt || ""),
              amount: Number(d.amount ?? existing?.amount ?? 0),
              currency: currency || existing?.currency,
              interval: String(d.interval || existing?.interval || "monthly"),
              autoRenew: typeof d.autoRenew === "boolean" ? d.autoRenew : !!existing?.autoRenew,
              paymentRef: typeof d.paymentRef === "string" ? d.paymentRef : undefined,
              lastPaymentRef:
                typeof d.lastPaymentRef === "string" ? d.lastPaymentRef : undefined,
            };
            memberMap.set(docSnap.id, merged);
            if (typeof d.paymentRef === "string" && d.paymentRef) {
              subByPaymentRef.set(d.paymentRef, d);
            }
            if (typeof d.lastPaymentRef === "string" && d.lastPaymentRef) {
              subByPaymentRef.set(d.lastPaymentRef, d);
            }
          }
        }

        const mergedMembers = Array.from(memberMap.values()).sort(
          (a, b) => toTimestampMs(b.subscribedAt) - toTimestampMs(a.subscribedAt),
        );
        setMembers(mergedMembers);

        // 2. Collect successful community transactions indexed by ref
        const txByRef = new Map<string, Record<string, any> & { id: string }>();
        const ingestTxSnapshot = (snap: any) => {
          if (!snap) return;
          for (const docSnap of snap.docs) {
            const d = docSnap.data();
            const isCommunityTx =
              d.type === "community" ||
              Boolean(d.communitySubscriptionId) ||
              Boolean(d.communityTierId);
            const isSucceeded = d.status === "successful" || d.status === "success";
            if (!isCommunityTx || !isSucceeded) continue;
            const ref = String(d.ref || d.txRef || docSnap.id);
            txByRef.set(ref, { id: docSnap.id, ...d });
          }
        };

        if (txByUidResult.status === "fulfilled") ingestTxSnapshot(txByUidResult.value);
        if (txByHandleResult.status === "fulfilled") ingestTxSnapshot(txByHandleResult.value);

        const tierLookup = new Map(
          settings.tiers.map((t) => [t.id, t]),
        );

        // 3. Build unified earnings list from creatorIncome + any missing successful transactions
        const recordsByRef = new Map<string, CommunityEarningRecord>();

        if (incomeResult.status === "fulfilled" && incomeResult.value) {
          for (const docSnap of incomeResult.value.docs) {
            const d = docSnap.data();
            if (d.reason !== "community_subscription") continue;
            const ref = String(d.txRef || docSnap.id);
            const tx = txByRef.get(ref);
            const sub =
              subByPaymentRef.get(ref) ||
              (d.subscriptionId
                ? (memberMap.get(String(d.subscriptionId)) as Record<string, any> | undefined)
                : undefined);
            const currency =
              resolveHistoricalCurrency(d) ||
              resolveHistoricalCurrency(tx) ||
              "RWF";
            const netAmount = Number(d.amount || 0);
            const grossAmount = Number(tx?.amount ?? sub?.amount ?? netAmount);
            const tierId = String(d.tierId || tx?.communityTierId || sub?.tierId || "");
            const tierName =
              String(d.tierName || sub?.tierName || tierLookup.get(tierId)?.name || "Membership");
            const supporterName =
              String(
                tx?.supporterName ||
                  tx?.buyerName ||
                  sub?.userName ||
                  sub?.userEmail ||
                  tx?.buyerEmail ||
                  "Community Member",
              );
            const createdAtMs =
              toTimestampMs(d.createdAt) ||
              toTimestampMs(tx?.successfulAt) ||
              toTimestampMs(tx?.createdAt);
            const createdAtLabel = createdAtMs
              ? new Date(createdAtMs).toLocaleDateString()
              : "-";

            recordsByRef.set(ref, {
              id: docSnap.id,
              txRef: ref,
              supporterName,
              tierName,
              interval: String(tx?.communityInterval || sub?.interval || "monthly"),
              grossAmount,
              netAmount,
              currency,
              paymentMethod: String(tx?.paymentMethod || sub?.paymentMethod || "-"),
              createdAtMs,
              createdAtLabel,
              status: "Paid",
            });
          }
        }

        for (const [ref, tx] of txByRef.entries()) {
          if (recordsByRef.has(ref)) continue;
          const sub =
            subByPaymentRef.get(ref) ||
            (tx.communitySubscriptionId
              ? (memberMap.get(String(tx.communitySubscriptionId)) as Record<string, any> | undefined)
              : undefined);
          const currency = resolveHistoricalCurrency(tx) || "RWF";
          const grossAmount = Number(tx.amount || 0);
          const netAmount = Number(
            tx.creatorEarnings ?? Math.round(grossAmount * 0.9 * 100) / 100,
          );
          const tierId = String(tx.communityTierId || sub?.tierId || "");
          const tierName =
            String(sub?.tierName || tierLookup.get(tierId)?.name || "Membership");
          const supporterName =
            String(
              tx.supporterName ||
                tx.buyerName ||
                sub?.userName ||
                sub?.userEmail ||
                tx.buyerEmail ||
                "Community Member",
            );
          const createdAtMs =
            toTimestampMs(tx.successfulAt) || toTimestampMs(tx.createdAt);
          const createdAtLabel = createdAtMs
            ? new Date(createdAtMs).toLocaleDateString()
            : "-";

          recordsByRef.set(ref, {
            id: tx.id,
            txRef: ref,
            supporterName,
            tierName,
            interval: String(tx.communityInterval || sub?.interval || "monthly"),
            grossAmount,
            netAmount,
            currency,
            paymentMethod: String(tx.paymentMethod || sub?.paymentMethod || "-"),
            createdAtMs,
            createdAtLabel,
            status: "Paid",
          });
        }

        const sortedEarnings = Array.from(recordsByRef.values()).sort(
          (a, b) => b.createdAtMs - a.createdAtMs,
        );
        setEarnings(sortedEarnings);
      } catch (err) {
        console.error("Failed to fetch community members/earnings", err);
      } finally {
        if (!cancelled) setLoadingEarnings(false);
      }
    }

    void loadCommunityData();
    return () => {
      cancelled = true;
    };
  }, [creatorHandle, creatorUid, settings.enabled, settings.tiers]);

  const earningsByCurrency = useMemo(() => {
    return earnings.reduce<Record<string, { net: number; gross: number; count: number }>>(
      (acc, row) => {
        const cur = row.currency || "RWF";
        if (!acc[cur]) acc[cur] = { net: 0, gross: 0, count: 0 };
        acc[cur].net += row.netAmount;
        acc[cur].gross += row.grossAmount;
        acc[cur].count += 1;
        return acc;
      },
      {},
    );
  }, [earnings]);

  const activeMembersCount = useMemo(
    () => members.filter((m) => m.status === "active").length,
    [members],
  );

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
                <>
                  {/* Mobile list */}
                  <div className="divide-y divide-line md:hidden">
                    {members.map((m) => (
                      <div key={m.subscriptionId} className="space-y-2.5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-label font-bold text-fg">
                              {m.userName || m.userEmail || m.userId || "Member"}
                            </p>
                            <p className="truncate text-caption text-muted-fg">
                              {m.tierName}
                            </p>
                          </div>
                          <Badge
                            tone={
                              m.status === "active"
                                ? "success"
                                : m.status === "cancelled"
                                  ? "warning"
                                  : "neutral"
                            }
                            className="shrink-0 uppercase"
                          >
                            {m.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-caption">
                          <span className="font-semibold tabular-nums text-fg">
                            {formatCurrency(
                              m.amount,
                              (resolveHistoricalCurrency(m as unknown as Record<string, unknown>) ||
                                defaultCurrency) as any,
                            )}
                            <span className="ml-1 font-normal text-muted-fg">
                              /{m.interval === "yearly" ? "yr" : "mo"}
                            </span>
                          </span>
                          <span className="tabular-nums text-muted-fg">
                            Expires{" "}
                            {m.expiresAt
                              ? new Date(m.expiresAt).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[580px] text-label">
                      <thead>
                        <tr className="border-b border-line bg-surface-sunken">
                          <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                            Member
                          </th>
                          <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                            Tier
                          </th>
                          <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                            Status
                          </th>
                          <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                            Amount
                          </th>
                          <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
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
                            <td className="max-w-xs p-4">
                              <p className="truncate font-medium">
                                {m.userName || m.userEmail || m.userId || "Member"}
                              </p>
                            </td>
                            <td className="p-4 text-muted-fg">{m.tierName}</td>
                            <td className="whitespace-nowrap p-4">
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
                            <td className="whitespace-nowrap p-4 font-medium tabular-nums">
                              {formatCurrency(
                                m.amount,
                                (resolveHistoricalCurrency(m as unknown as Record<string, unknown>) ||
                                  defaultCurrency) as any,
                              )}
                              <span className="ml-1 text-caption text-muted-fg">
                                /{m.interval === "yearly" ? "yr" : "mo"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap p-4 text-caption tabular-nums text-muted-fg">
                              {m.expiresAt
                                ? new Date(m.expiresAt).toLocaleDateString()
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}

          {activeTab === "earnings" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.keys(earningsByCurrency).length === 0 ? (
                  <Card className="p-5">
                    <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                      Community earnings
                    </p>
                    <p className="mt-2 text-heading font-bold tabular-nums text-fg">
                      {formatCurrency(0, defaultCurrency as any)}
                    </p>
                  </Card>
                ) : (
                  Object.entries(earningsByCurrency).map(([cur, group]) => (
                    <Card key={cur} className="p-5">
                      <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                        Net earnings ({cur})
                      </p>
                      <p className="mt-2 text-heading font-bold tabular-nums text-brand-strong">
                        {formatCurrency(group.net, cur as any)}
                      </p>
                      <p className="mt-1 text-caption tabular-nums text-muted-fg">
                        {group.count} subscription {group.count === 1 ? "payment" : "payments"}
                      </p>
                    </Card>
                  ))
                )}

                <Card className="p-5">
                  <p className="text-caption font-bold uppercase tracking-widest text-muted-fg">
                    Active members
                  </p>
                  <p className="mt-2 text-heading font-bold tabular-nums text-fg">
                    {activeMembersCount}
                  </p>
                  <p className="mt-1 text-caption tabular-nums text-muted-fg">
                    {members.length} total subscribed
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                {loadingEarnings ? (
                  <div className="flex items-center justify-center py-12" role="status">
                    <Loader className="size-6 animate-spin text-brand-strong" aria-hidden="true" />
                  </div>
                ) : earnings.length === 0 ? (
                  <EmptyState
                    icon={<DollarSign className="size-6" aria-hidden="true" />}
                    title="No subscription earnings yet"
                    description="Community earnings will appear here once supporters subscribe to a tier."
                    className="border-0 py-12"
                  />
                ) : (
                  <>
                    {/* Mobile list */}
                    <div className="divide-y divide-line md:hidden">
                      {earnings.map((row) => (
                        <div key={row.id} className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-label font-bold text-fg">
                                {row.supporterName}
                              </p>
                              <p className="truncate text-caption text-muted-fg">
                                {row.tierName} · {row.createdAtLabel}
                              </p>
                            </div>
                            <Badge tone="success" className="shrink-0 uppercase">
                              {row.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-caption">
                            <span className="font-bold tabular-nums text-brand-strong">
                              {formatCurrency(row.netAmount, row.currency as any)} net
                            </span>
                            <span className="truncate font-mono text-muted-fg">
                              {row.txRef}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[600px] text-label">
                        <thead>
                          <tr className="border-b border-line bg-surface-sunken">
                            <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Member
                            </th>
                            <th className="p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Tier
                            </th>
                            <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Net earnings
                            </th>
                            <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Method
                            </th>
                            <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Date
                            </th>
                            <th className="whitespace-nowrap p-4 text-left text-caption font-bold uppercase tracking-widest text-muted-fg">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-line last:border-0"
                            >
                              <td className="max-w-xs p-4">
                                <p className="truncate font-medium text-fg">
                                  {row.supporterName}
                                </p>
                                <p className="truncate font-mono text-caption text-muted-fg">
                                  {row.txRef}
                                </p>
                              </td>
                              <td className="p-4 text-muted-fg">{row.tierName}</td>
                              <td className="whitespace-nowrap p-4 font-bold tabular-nums text-brand-strong">
                                {formatCurrency(row.netAmount, row.currency as any)}
                              </td>
                              <td className="whitespace-nowrap p-4 uppercase text-caption text-muted-fg">
                                {row.paymentMethod}
                              </td>
                              <td className="whitespace-nowrap p-4 text-caption tabular-nums text-muted-fg">
                                {row.createdAtLabel}
                              </td>
                              <td className="whitespace-nowrap p-4">
                                <Badge tone="success" className="uppercase">
                                  {row.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
