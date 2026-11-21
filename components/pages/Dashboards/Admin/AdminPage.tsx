/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sendCommsEmail } from "@/lib/commsService";
import { auth, db } from "@/db/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Users,
  Eye,
  DollarSign,
  UserCheck,
  BarChart3,
  XCircle,
  ShieldAlert,
  Wallet,
  Gift,
  ShoppingBag,
  Activity,
  Clock,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RankRow } from "@/components/parts/dashboard/RankRow";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";
import {
  normalizePayoutCurrency,
  totalEarningsField,
  type PayoutCurrency,
} from "@/lib/payouts/currency";
import { PAYMENT_RAIL_PROVIDER_LIST } from "@/lib/money";
import { formatCurrency } from "@/types/currency";
import { cn } from "@/lib/cn";

const TOP_EARNER_CURRENCIES = Array.from(
  new Set(
    PAYMENT_RAIL_PROVIDER_LIST.flatMap((provider) => provider.currencies)
      .map((code) => normalizePayoutCurrency(code))
      .filter((code): code is PayoutCurrency => code !== null),
  ),
);

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function currencyCodeOf(raw: any): string {
  return typeof raw?.currency === "string" && raw.currency.trim()
    ? raw.currency.trim().toUpperCase()
    : "RWF";
}

function formatCurrencyTotals(totals: Record<string, number>, empty = "0"): string {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Number(amount) > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return empty;
  return entries.map(([code, amount]) => formatCurrency(amount, code)).join(" · ");
}

function primaryCurrencyValue(totals: Record<string, number>, empty = "0"): string {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Number(amount) > 0)
    .sort(([a], [b]) => {
      if (a === "RWF") return -1;
      if (b === "RWF") return 1;
      return a.localeCompare(b);
    });
  if (entries.length === 0) return empty;
  return formatCurrency(entries[0][1], entries[0][0]);
}

function secondaryCurrencyDetail(totals: Record<string, number>, empty = "No activity yet"): string {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Number(amount) > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return empty;
  if (entries.length === 1) return `${entries[0][0]} total`;
  return entries.map(([code, amount]) => formatCurrency(amount, code)).join(" · ");
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    incomeByCurrency: {} as Record<string, number>,
    payoutsByCurrency: {} as Record<string, number>,
    pendingByCurrency: {} as Record<string, number>,
    transactionsByCurrency: {} as Record<string, number>,
    avgByCurrency: {} as Record<string, number>,
    profileCount: 0,
    creatorCount: 0,
    totalViews: 0,
    totalSupports: 0,
    totalProducts: 0,
    totalGiveaways: 0,
    totalOrders: 0,
    newProfiles30d: 0,
    prevProfiles30d: 0,
    successfulTransactionCount: 0,
    failedTransactionCount: 0,
    pendingTransactionCount: 0,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState<"day" | "week" | "month" | "annual">("month");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("RWF");

  const [topEarnerGroups, setTopEarnerGroups] = useState<
    Array<{ currency: PayoutCurrency; earners: any[] }>
  >([]);
  const [topViewed, setTopViewed] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [fxHealth, setFxHealth] = useState<any>(null);

  const [growthFilter, setGrowthFilter] = useState<"7d" | "weekly" | "monthly" | "annual">("7d");
  const [rawProfiles, setRawProfiles] = useState<any[]>([]);
  const [rawIncome, setRawIncome] = useState<any[]>([]);
  const [rawPayouts, setRawPayouts] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [dataLoadedAt, setDataLoadedAt] = useState<number>(0);

  const [modal, setModal] = useState<{
    type: "approve" | "reject";
    target: any;
    category: "withdrawal" | "verification";
  } | null>(null);

  const availableCurrencies = useMemo(() => {
    const set = new Set<string>(["RWF"]);
    rawIncome.forEach((inc) => set.add(currencyCodeOf(inc)));
    rawPayouts.forEach((p) => set.add(currencyCodeOf(p)));
    rawTransactions.forEach((tx) => set.add(currencyCodeOf(tx)));
    return Array.from(set).sort((a, b) => (a === "RWF" ? -1 : b === "RWF" ? 1 : a.localeCompare(b)));
  }, [rawIncome, rawPayouts, rawTransactions]);

  const activeCurrency = availableCurrencies.includes(selectedCurrency)
    ? selectedCurrency
    : availableCurrencies[0] || "RWF";

  const userGrowthData = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const current: number[] = [];
    const previous: number[] = [];

    const countInRange = (start: Date, end: Date) =>
      rawProfiles.filter((p) => {
        const created = toDateSafe(p.createdAt);
        return created ? created >= start && created < end : false;
      }).length;

    if (growthFilter === "7d") {
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
        const prevStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() - 7);
        const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + 1);
        labels.push(dayStart.toLocaleDateString("en-US", { weekday: "short" }));
        current.push(countInRange(dayStart, dayEnd));
        previous.push(countInRange(prevStart, prevEnd));
      }
    } else if (growthFilter === "weekly") {
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 - i * 7);
        const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
        const prevEnd = new Date(weekStart);
        const prevStart = new Date(weekStart.getTime() - 7 * 86_400_000);
        labels.push(
          weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        );
        current.push(countInRange(weekStart, weekEnd));
        previous.push(countInRange(prevStart, prevEnd));
      }
    } else if (growthFilter === "monthly") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = now.getMonth();
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = currentMonth - i < 0 ? -1 : 0;
        const year = now.getFullYear() + yearOffset;
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 1);
        const prevMonthStart = new Date(year - 1, monthIndex, 1);
        const prevMonthEnd = new Date(year - 1, monthIndex + 1, 1);
        labels.push(months[monthIndex]);
        current.push(countInRange(monthStart, monthEnd));
        previous.push(countInRange(prevMonthStart, prevMonthEnd));
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        const prevStart = new Date(year - 1, 0, 1);
        labels.push(String(year));
        current.push(countInRange(yearStart, yearEnd));
        previous.push(countInRange(prevStart, yearStart));
      }
    }

    return { labels, current, previous };
  }, [growthFilter, rawProfiles]);

  const monthlyData = useMemo(() => {
    const scopedIncome = rawIncome.filter((inc) => currencyCodeOf(inc) === activeCurrency);
    const scopedPayouts = rawPayouts.filter((p) => currencyCodeOf(p) === activeCurrency);
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result: { label: string; income: number; payouts: number }[] = [];

    const sumInRange = (items: any[], start: Date, end: Date) =>
      items.reduce((sum, item) => {
        const d = toDateSafe(item.createdAt);
        return d && d >= start && d < end ? sum + (Number(item.amount) || 0) : sum;
      }, 0);

    if (timeframeFilter === "day") {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        result.push({
          label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          income: sumInRange(scopedIncome, start, end),
          payouts: sumInRange(scopedPayouts, start, end),
        });
      }
    } else if (timeframeFilter === "week") {
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 - i * 7);
        const start = new Date(end.getTime() - 7 * 86_400_000);
        result.push({
          label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          income: sumInRange(scopedIncome, start, end),
          payouts: sumInRange(scopedPayouts, start, end),
        });
      }
    } else if (timeframeFilter === "month") {
      const currentMonth = now.getMonth();
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = currentMonth - i < 0 ? -1 : 0;
        const year = now.getFullYear() + yearOffset;
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 1);
        result.push({
          label: months[monthIndex],
          income: sumInRange(scopedIncome, start, end),
          payouts: sumInRange(scopedPayouts, start, end),
        });
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        result.push({
          label: String(year),
          income: sumInRange(scopedIncome, start, end),
          payouts: sumInRange(scopedPayouts, start, end),
        });
      }
    }

    return result;
  }, [timeframeFilter, rawIncome, rawPayouts, activeCurrency]);

  const txBreakdown = useMemo(() => {
    const windowMs =
      timeframeFilter === "day"
        ? 7 * 86_400_000
        : timeframeFilter === "week"
          ? 35 * 86_400_000
          : timeframeFilter === "month"
            ? 180 * 86_400_000
            : 3 * 365 * 86_400_000;

    const breakdown: Record<
      "support" | "store" | "booking" | "gathering" | "community",
      { successful: number; failed: number; pending: number; count: number }
    > = {
      support: { successful: 0, failed: 0, pending: 0, count: 0 },
      community: { successful: 0, failed: 0, pending: 0, count: 0 },
      store: { successful: 0, failed: 0, pending: 0, count: 0 },
      booking: { successful: 0, failed: 0, pending: 0, count: 0 },
      gathering: { successful: 0, failed: 0, pending: 0, count: 0 },
    };

    rawTransactions.forEach((tx) => {
      if (currencyCodeOf(tx) !== activeCurrency) return;
      const rawType = String(tx.type || "support");
      if (!(rawType in breakdown)) return;
      const d = toDateSafe(tx.createdAt);
      if (d && dataLoadedAt > 0 && dataLoadedAt - d.getTime() > windowMs) return;

      const amt = Number(tx.amount) || 0;
      const row = breakdown[rawType as keyof typeof breakdown];
      row.count += 1;
      if (tx.status === "successful" || tx.status === "success") row.successful += amt;
      else if (tx.status === "failed") row.failed += amt;
      else if (tx.status === "pending") row.pending += amt;
    });

    return breakdown;
  }, [timeframeFilter, rawTransactions, activeCurrency, dataLoadedAt]);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      setLoadError(false);
    }

    try {
      const [
        incomeSnap,
        profilesSnap,
        creatorsSnap,
        supportsSnap,
        productsSnap,
        giveawaysSnap,
        ordersSnap,
        payoutsSnap,
        transactionsSnap,
        viewsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "platformIncome")),
        getDocs(collection(db, "profiles")),
        getDocs(collection(db, "creators")),
        getDocs(collection(db, "supportedCreators")),
        getDocs(collection(db, "storeProducts")),
        getDocs(collection(db, "giveaways")),
        getDocs(collection(db, "storeOrders")),
        getDocs(collection(db, "payouts")),
        getDocs(collection(db, "transactions")),
        getDocs(query(collection(db, "creators"), orderBy("views", "desc"), limit(5))),
      ]);

      const incomeDocs = incomeSnap.docs.map((d) => d.data());
      const incomeByCurrency: Record<string, number> = {};
      incomeDocs.forEach((data) => {
        const code = currencyCodeOf(data);
        incomeByCurrency[code] = (incomeByCurrency[code] || 0) + (Number(data.amount) || 0);
      });

      const allProfiles = profilesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const nowMs = Date.now();
      const thirtyDaysMs = 30 * 86_400_000;
      let newProfiles30d = 0;
      let prevProfiles30d = 0;
      allProfiles.forEach((p: any) => {
        const d = toDateSafe(p.createdAt);
        if (!d) return;
        const age = nowMs - d.getTime();
        if (age >= 0 && age <= thirtyDaysMs) newProfiles30d += 1;
        else if (age > thirtyDaysMs && age <= 2 * thirtyDaysMs) prevProfiles30d += 1;
      });

      let totalViews = 0;
      const pendingByCurrency: Record<string, number> = {};
      creatorsSnap.forEach((cDoc) => {
        const data = cDoc.data();
        totalViews += Number(data.views) || 0;
        const rwfPending = Number(data.pendingPayout) || 0;
        if (rwfPending > 0) {
          pendingByCurrency.RWF = (pendingByCurrency.RWF || 0) + rwfPending;
        }
        for (const [key, value] of Object.entries(data)) {
          const match = key.match(/^pendingPayout([A-Z]{3})$/);
          if (!match) continue;
          const amount = Number(value) || 0;
          if (amount > 0) {
            pendingByCurrency[match[1]] = (pendingByCurrency[match[1]] || 0) + amount;
          }
        }
      });

      const allPayouts = payoutsSnap.docs.map((d) => d.data());
      const payoutsByCurrency: Record<string, number> = {};
      allPayouts.forEach((data) => {
        const code = currencyCodeOf(data);
        payoutsByCurrency[code] = (payoutsByCurrency[code] || 0) + (Number(data.amount) || 0);
      });

      const allTransactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const transactionsByCurrency: Record<string, number> = {};
      const countsByCurrency: Record<string, number> = {};
      let successfulCount = 0;
      let failedCount = 0;
      let pendingCount = 0;

      allTransactions.forEach((tx: any) => {
        if (tx.status === "successful" || tx.status === "success") {
          const code = currencyCodeOf(tx);
          transactionsByCurrency[code] =
            (transactionsByCurrency[code] || 0) + (Number(tx.amount) || 0);
          countsByCurrency[code] = (countsByCurrency[code] || 0) + 1;
          successfulCount += 1;
        } else if (tx.status === "failed") {
          failedCount += 1;
        } else if (tx.status === "pending") {
          pendingCount += 1;
        }
      });

      const avgByCurrency: Record<string, number> = {};
      for (const [code, sum] of Object.entries(transactionsByCurrency)) {
        const count = countsByCurrency[code] || 1;
        avgByCurrency[code] = Math.round(sum / count);
      }

      const earnerGroups = (
        await Promise.all(
          TOP_EARNER_CURRENCIES.map(async (currency) => {
            const field = totalEarningsField(currency);
            try {
              const snap = await getDocs(
                query(collection(db, "creators"), orderBy(field, "desc"), limit(5)),
              );
              return {
                currency,
                earners: snap.docs
                  .map((d: any) => ({ id: d.id, ...d.data() }))
                  .filter((earner: any) => Number(earner[field] ?? 0) > 0),
              };
            } catch {
              return { currency, earners: [] as any[] };
            }
          }),
        )
      ).filter((group) => group.earners.length > 0);

      setLoadError(false);
      setDataLoadedAt(nowMs);
      setRawProfiles(allProfiles);
      setRawIncome(incomeDocs);
      setRawPayouts(allPayouts);
      setRawTransactions(allTransactions);
      setTopEarnerGroups(earnerGroups);
      setTopViewed(viewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setStats({
        incomeByCurrency,
        payoutsByCurrency,
        pendingByCurrency,
        transactionsByCurrency,
        avgByCurrency,
        profileCount: profilesSnap.size,
        creatorCount: creatorsSnap.size,
        totalViews,
        totalSupports: supportsSnap.size,
        totalProducts: productsSnap.size,
        totalGiveaways: giveawaysSnap.size,
        totalOrders: ordersSnap.size,
        newProfiles30d,
        prevProfiles30d,
        successfulTransactionCount: successfulCount,
        failedTransactionCount: failedCount,
        pendingTransactionCount: pendingCount,
      });

      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch("/api/admin/fx/health", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setFxHealth(await res.json());
          } else {
            setFxHealth({ ok: false, status: "error", message: `HTTP ${res.status}` });
          }
        }
      } catch {
        setFxHealth({ ok: false, status: "error", message: "Failed to load FX health" });
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const withdrawalQuery = query(
      collection(db, "withdrawRequests"),
      where("status", "==", "pending"),
    );
    const unsubWithdrawals = onSnapshot(withdrawalQuery, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const verificationQuery = query(
      collection(db, "verificationRequests"),
      where("status", "==", "pending"),
    );
    const unsubVerifications = onSnapshot(verificationQuery, (snap) => {
      Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let creatorData: any = {};
          if (data.uid) {
            const creatorSnap = await getDocs(
              query(collection(db, "creators"), where("uid", "==", data.uid), limit(1)),
            );
            if (!creatorSnap.empty) {
              const c = creatorSnap.docs[0];
              creatorData = {
                id: c.id,
                name: c.data().name || "",
                handle: c.id,
                profilePicture: c.data().profilePicture || "",
              };
            }
          }
          return { id: d.id, ...data, ...creatorData };
        }),
      ).then((items) => {
        const seen = new Set<string>();
        setVerifications(
          items.filter((item) => {
            if (!item.uid || seen.has(item.uid)) return false;
            seen.add(item.uid);
            return true;
          }),
        );
      });
    });

    const logsQuery = query(
      collection(db, "activityLogs"),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setRecentActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchData(false);
      }
    });

    return () => {
      cancelled = true;
      unsubWithdrawals();
      unsubVerifications();
      unsubLogs();
    };
  }, [fetchData]);

  const handleAction = async () => {
    if (!modal) return;
    setProcessing(true);
    const { target, type, category } = modal;

    try {
      let userEmail = "";
      const profileId = category === "withdrawal" ? target.handle : target.uid;
      if (profileId) {
        const profileSnap = await getDoc(doc(db, "profiles", profileId));
        if (profileSnap.exists()) {
          userEmail = profileSnap.data().email || "";
        }
      }

      if (category === "withdrawal") {
        if (!auth.currentUser) {
          throw new Error("You must be signed in to review withdrawals");
        }
        const token = await auth.currentUser.getIdToken();
        const response = await fetch("/api/admin/payouts/withdrawals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId: target.id,
            action: type,
            method: target.method,
            accountNumber: target.accountNumber,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          amount?: number;
          currency?: PayoutCurrency;
          method?: string;
          accountNumber?: string;
          creatorName?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Withdrawal action failed");
        }

        const approvedAmount = Number(payload.amount ?? target.amount);
        const approvedCurrency = (payload.currency || target.currency) as PayoutCurrency;
        const approvedMethod = String(payload.method || target.method || "MoMo");
        const approvedAccount = String(payload.accountNumber || target.accountNumber || "");
        const creatorName = String(payload.creatorName || target.creatorName || "");

        if (type === "approve") {
          await sendCommsEmail("payout_processed", {
            creatorEmail: userEmail,
            creatorName,
            amount: approvedAmount,
            currency: approvedCurrency,
            method: approvedMethod,
            accountNumber: approvedAccount,
          });
        } else {
          const adminsSnap = await getDocs(
            query(collection(db, "profiles"), where("isAdmin", "==", true)),
          );
          for (const adminDoc of adminsSnap.docs) {
            await addDoc(collection(db, "notifications"), {
              userId: adminDoc.id,
              type: category,
              title: "Withdrawal Rejected",
              message: `Withdrawal of ${approvedAmount.toLocaleString()} ${approvedCurrency} for ${creatorName} was rejected`,
              read: false,
              createdAt: serverTimestamp(),
            });
          }
        }

        await logActivity({
          level: type === "approve" ? "success" : "warning",
          category: "payout",
          message: `Withdrawal ${type === "approve" ? "approved" : "rejected"}: ${target.amount?.toLocaleString()} ${target.currency ?? ""} for ${target.creatorName}`,
          creatorId: target.creatorId,
          creatorHandle: target.creatorHandle,
        });

        toast.success(`Withdrawal ${type === "approve" ? "approved" : "rejected"}`);
      } else {
        const isApprove = type === "approve";
        await updateDoc(doc(db, "creators", target.handle || target.id), {
          verified: isApprove,
          verificationStatus: isApprove ? "approved" : "rejected",
        });

        const pendingSnap = await getDocs(
          query(
            collection(db, "verificationRequests"),
            where("uid", "==", target.uid),
            where("status", "==", "pending"),
          ),
        );
        await Promise.all(
          pendingSnap.docs.map((d) =>
            updateDoc(doc(db, "verificationRequests", d.id), {
              status: isApprove ? "approved" : "rejected",
              updatedAt: serverTimestamp(),
            }),
          ),
        );

        await sendCommsEmail("verification_feedback", {
          email: userEmail,
          name: target.name,
          approved: isApprove,
          reason: isApprove ? "" : rejectionReason,
          creatorUid: target.uid,
          handle: target.handle,
        });

        await logActivity({
          level: isApprove ? "success" : "warning",
          category: "verification",
          message: `Verification ${type}: ${target.name} (@${target.handle})`,
          creatorId: target.uid,
          creatorHandle: target.handle,
        });

        toast.success(`Verification ${isApprove ? "approved" : "rejected"}`);
      }

      setModal(null);
      setRejectionReason("");
      void fetchData(false);
    } catch (error) {
      console.error("Action failed:", error);
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingState variant="dashboard" className="mx-auto max-w-7xl px-6 py-10" />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <ErrorState
          title="Couldn't load admin overview"
          description="Check your permissions and network connection, then try again."
          onRetry={() => void fetchData(false)}
        />
      </div>
    );
  }

  const growthPercent =
    stats.prevProfiles30d > 0
      ? Math.round(((stats.newProfiles30d - stats.prevProfiles30d) / stats.prevProfiles30d) * 100)
      : null;

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-semibold text-brand-strong">Operations</p>
            <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
              Platform overview
            </h1>
            <p className="mt-1 text-label text-muted-fg">
              Monitor revenue, review payouts and identity checks, and track platform health.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/payouts"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface px-3.5 text-label font-semibold text-fg transition-colors hover:bg-surface-raised"
            >
              Payouts
              <ArrowUpRight className="size-3.5 text-muted-fg" aria-hidden="true" />
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface px-3.5 text-label font-semibold text-fg transition-colors hover:bg-surface-raised"
            >
              Users
              <ArrowUpRight className="size-3.5 text-muted-fg" aria-hidden="true" />
            </Link>
            <Button
              variant="primary"
              size="sm"
              loading={refreshing}
              onClick={() => void fetchData(true)}
              leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* Executive KPI Grid */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold text-muted-fg">Successful volume</p>
              <Activity className="size-4 text-brand-strong" aria-hidden="true" />
            </div>
            <p className="mt-2 text-title font-black tabular-nums text-fg">
              {primaryCurrencyValue(stats.transactionsByCurrency)}
            </p>
            <p className="mt-1 text-caption tabular-nums text-muted-fg">
              {secondaryCurrencyDetail(stats.transactionsByCurrency)} ·{" "}
              {stats.successfulTransactionCount.toLocaleString()} paid
            </p>
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold text-muted-fg">Platform income</p>
              <DollarSign className="size-4 text-success" aria-hidden="true" />
            </div>
            <p className="mt-2 text-title font-black tabular-nums text-fg">
              {primaryCurrencyValue(stats.incomeByCurrency)}
            </p>
            <p className="mt-1 text-caption tabular-nums text-muted-fg">
              {secondaryCurrencyDetail(stats.incomeByCurrency, "No platform income yet")}
            </p>
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold text-muted-fg">Pending payouts</p>
              <Clock className="size-4 text-warning" aria-hidden="true" />
            </div>
            <p className="mt-2 text-title font-black tabular-nums text-fg">
              {primaryCurrencyValue(stats.pendingByCurrency)}
            </p>
            <p className="mt-1 text-caption tabular-nums text-muted-fg">
              Processed: {formatCurrencyTotals(stats.payoutsByCurrency, "0")}
            </p>
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold text-muted-fg">Pending &amp; failed txs</p>
              <XCircle className="size-4 text-danger" aria-hidden="true" />
            </div>
            <p className="mt-2 text-title font-black tabular-nums text-fg">
              {stats.pendingTransactionCount.toLocaleString()} pending ·{" "}
              {stats.failedTransactionCount.toLocaleString()} failed
            </p>
            <p className="mt-1 text-caption tabular-nums text-muted-fg">
              Avg order: {formatCurrencyTotals(stats.avgByCurrency, "0")}
            </p>
          </div>
        </section>

        {/* Secondary Activity Counts */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Accounts",
              value: stats.profileCount.toLocaleString(),
              sub:
                growthPercent !== null
                  ? `${growthPercent >= 0 ? "+" : ""}${growthPercent}% vs prev 30d`
                  : `${stats.newProfiles30d} in 30d`,
              icon: Users,
            },
            {
              label: "Creators",
              value: stats.creatorCount.toLocaleString(),
              sub: `${stats.totalViews.toLocaleString()} visits`,
              icon: UserCheck,
            },
            {
              label: "Supports",
              value: stats.totalSupports.toLocaleString(),
              sub: "All time",
              icon: Gift,
            },
            {
              label: "Store orders",
              value: stats.totalOrders.toLocaleString(),
              sub: `${stats.totalProducts} products`,
              icon: ShoppingBag,
            },
            {
              label: "Withdrawals",
              value: withdrawals.length.toLocaleString(),
              sub: "Awaiting review",
              icon: Wallet,
            },
            {
              label: "Verifications",
              value: verifications.length.toLocaleString(),
              sub: "Awaiting review",
              icon: ShieldAlert,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-center gap-1.5 text-caption font-medium text-muted-fg">
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </div>
                <p className="mt-1.5 text-title font-bold tabular-nums text-fg">
                  {item.value}
                </p>
                <p className="mt-0.5 truncate text-caption tabular-nums text-muted-fg">
                  {item.sub}
                </p>
              </div>
            );
          })}
        </section>

        {/* Action Queues First: Withdrawals & Verifications */}
        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="size-4 text-brand-strong" aria-hidden="true" />
                <h2 className="text-body font-bold text-fg">Withdrawal queue</h2>
              </div>
              <span className="text-caption font-semibold tabular-nums text-muted-fg">
                {withdrawals.length} pending
              </span>
            </div>
            <div className="max-h-96 divide-y divide-line overflow-y-auto">
              {withdrawals.length === 0 ? (
                <p className="px-5 py-10 text-center text-label text-muted-fg">
                  No pending withdrawal requests.
                </p>
              ) : (
                withdrawals.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-raised/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-label font-bold text-fg">
                        {req.creatorName || "Creator"}
                      </p>
                      <p className="mt-0.5 text-body font-black tabular-nums text-fg">
                        {formatCurrency(
                          Number(req.amount || 0),
                          req.payoutCurrency || req.currency || "RWF",
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-caption text-muted-fg">
                        {req.method} · {req.accountNumber}
                        {req.rail ? ` · ${String(req.rail).replace(/_/g, " ")}` : ""}
                      </p>
                      {Array.isArray(req.sourceDebits) && req.sourceDebits.length > 0 && (
                        <p className="mt-1 text-caption tabular-nums text-muted-fg">
                          Sources:{" "}
                          {req.sourceDebits
                            .map(
                              (s: any) =>
                                `${Number(s.amountMajor || 0).toLocaleString()} ${s.currency}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          setModal({
                            type: "approve",
                            target: req,
                            category: "withdrawal",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModal({
                            type: "reject",
                            target: req,
                            category: "withdrawal",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="size-4 text-info" aria-hidden="true" />
                <h2 className="text-body font-bold text-fg">Verification queue</h2>
              </div>
              <span className="text-caption font-semibold tabular-nums text-muted-fg">
                {verifications.length} pending
              </span>
            </div>
            <div className="max-h-96 divide-y divide-line overflow-y-auto">
              {verifications.length === 0 ? (
                <p className="px-5 py-10 text-center text-label text-muted-fg">
                  No pending verification requests.
                </p>
              ) : (
                verifications.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-raised/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={creator.profilePicture}
                        name={creator.name || creator.handle || "Creator"}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-label font-bold text-fg">
                          {creator.name || "Creator"}
                        </p>
                        <p className="truncate text-caption text-muted-fg">
                          @{creator.handle}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          setModal({
                            type: "approve",
                            target: creator,
                            category: "verification",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModal({
                            type: "reject",
                            target: creator,
                            category: "verification",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Financial & Growth Reporting */}
        <section className="mb-8 rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-body font-bold text-fg">
                Revenue &amp; transaction breakdown ({activeCurrency})
              </h2>
              <p className="text-caption text-muted-fg">
                Isolated per currency to prevent multi-currency distortion.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-control bg-surface-raised p-1">
                {availableCurrencies.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedCurrency(code)}
                    className={cn(
                      "rounded px-2.5 py-1 text-caption font-semibold transition-colors",
                      activeCurrency === code
                        ? "bg-surface text-fg shadow-sm"
                        : "text-muted-fg hover:text-fg",
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-control bg-surface-raised p-1">
                {(
                  [
                    { key: "day", label: "7D" },
                    { key: "week", label: "Weekly" },
                    { key: "month", label: "Monthly" },
                    { key: "annual", label: "Annual" },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setTimeframeFilter(filter.key)}
                    className={cn(
                      "rounded px-2.5 py-1 text-caption font-semibold transition-colors",
                      timeframeFilter === filter.key
                        ? "bg-surface text-fg shadow-sm"
                        : "text-muted-fg hover:text-fg",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Platform income vs payouts chart */}
            <div className="lg:col-span-5">
              <p className="mb-3 text-caption font-semibold text-muted-fg">
                Platform fee vs Creator payouts ({activeCurrency})
              </p>
              <div className="overflow-x-auto pb-2">
                <div className="flex h-44 min-w-max items-end justify-between gap-2">
                  {monthlyData.map((data) => {
                    const maxValue = Math.max(
                      ...monthlyData.map((d) => Math.max(d.income, d.payouts)),
                      1,
                    );
                    const incomeHeight = (data.income / maxValue) * 100;
                    const payoutHeight = (data.payouts / maxValue) * 100;
                    return (
                      <div
                        key={data.label}
                        className="flex min-w-10 flex-1 flex-col items-center gap-1.5"
                      >
                        <div className="flex h-36 w-full items-end justify-center gap-1">
                          <div
                            className="w-4 rounded-t bg-success"
                            style={{ height: `${Math.max(incomeHeight, 3)}%` }}
                            title={`Income: ${formatCurrency(data.income, activeCurrency)}`}
                          />
                          <div
                            className="w-4 rounded-t bg-brand-strong"
                            style={{ height: `${Math.max(payoutHeight, 3)}%` }}
                            title={`Payouts: ${formatCurrency(data.payouts, activeCurrency)}`}
                          />
                        </div>
                        <span className="text-caption tabular-nums text-muted-fg">
                          {data.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-5 text-caption text-muted-fg">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-success" aria-hidden="true" />
                  Platform income
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-brand-strong" aria-hidden="true" />
                  Payouts
                </span>
              </div>
            </div>

            {/* Transaction table */}
            <div className="overflow-x-auto lg:col-span-7">
              <table className="w-full text-label">
                <thead>
                  <tr className="border-b border-line text-caption font-semibold text-muted-fg">
                    <th className="py-2.5 pr-4 text-left">Type</th>
                    <th className="px-3 py-2.5 text-right text-success">Successful</th>
                    <th className="px-3 py-2.5 text-right text-warning">Pending</th>
                    <th className="px-3 py-2.5 text-right text-danger">Failed</th>
                    <th className="py-2.5 pl-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(
                    [
                      { key: "support", label: "Support" },
                      { key: "community", label: "Memberships" },
                      { key: "store", label: "Store" },
                      { key: "booking", label: "Bookings" },
                      { key: "gathering", label: "Gatherings" },
                    ] as const
                  ).map((row) => {
                    const data = txBreakdown[row.key];
                    const total = data.successful + data.failed + data.pending;
                    return (
                      <tr key={row.key} className="hover:bg-surface-raised/50">
                        <td className="py-3 pr-4 font-semibold text-fg">
                          {row.label}
                          <span className="ml-1.5 text-caption font-normal tabular-nums text-muted-fg">
                            ({data.count})
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-success">
                          {formatCurrency(data.successful, activeCurrency)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-warning">
                          {formatCurrency(data.pending, activeCurrency)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-danger">
                          {formatCurrency(data.failed, activeCurrency)}
                        </td>
                        <td className="py-3 pl-3 text-right font-bold tabular-nums text-fg">
                          {formatCurrency(total, activeCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line font-bold">
                    <td className="py-3 pr-4 text-fg">All types</td>
                    <td className="px-3 py-3 text-right tabular-nums text-success">
                      {formatCurrency(
                        Object.values(txBreakdown).reduce((s, r) => s + r.successful, 0),
                        activeCurrency,
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-warning">
                      {formatCurrency(
                        Object.values(txBreakdown).reduce((s, r) => s + r.pending, 0),
                        activeCurrency,
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-danger">
                      {formatCurrency(
                        Object.values(txBreakdown).reduce((s, r) => s + r.failed, 0),
                        activeCurrency,
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums text-fg">
                      {formatCurrency(
                        Object.values(txBreakdown).reduce(
                          (s, r) => s + r.successful + r.pending + r.failed,
                          0,
                        ),
                        activeCurrency,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* User Growth & FX Health */}
        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-card border border-line bg-surface p-5 sm:p-6 lg:col-span-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-body font-bold text-fg">Account registrations</h2>
                <p className="text-caption text-muted-fg">Current vs prior period</p>
              </div>
              <div className="flex items-center gap-1 rounded-control bg-surface-raised p-1">
                {(
                  [
                    { key: "7d", label: "7D" },
                    { key: "weekly", label: "Weekly" },
                    { key: "monthly", label: "Monthly" },
                    { key: "annual", label: "Annual" },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setGrowthFilter(filter.key)}
                    className={cn(
                      "rounded px-2.5 py-1 text-caption font-semibold transition-colors",
                      growthFilter === filter.key
                        ? "bg-surface text-fg shadow-sm"
                        : "text-muted-fg hover:text-fg",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex h-44 min-w-max items-end justify-between gap-2">
                {userGrowthData.labels.map((label, index) => {
                  const maxValue = Math.max(
                    ...userGrowthData.current,
                    ...userGrowthData.previous,
                    1,
                  );
                  const currentHeight = (userGrowthData.current[index] / maxValue) * 100;
                  const prevHeight = (userGrowthData.previous[index] / maxValue) * 100;
                  return (
                    <div
                      key={label + index}
                      className="flex min-w-10 flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex h-36 w-full items-end justify-center gap-1">
                        <div
                          className="w-3.5 rounded-t bg-info"
                          style={{ height: `${Math.max(currentHeight, 3)}%` }}
                          title={`Current: ${userGrowthData.current[index]}`}
                        />
                        <div
                          className="w-3.5 rounded-t bg-surface-raised"
                          style={{ height: `${Math.max(prevHeight, 3)}%` }}
                          title={`Previous: ${userGrowthData.previous[index]}`}
                        />
                      </div>
                      <span className="max-w-12 truncate text-caption tabular-nums text-muted-fg">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-5 text-caption text-muted-fg">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-info" aria-hidden="true" />
                Current period
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-surface-raised border border-line" aria-hidden="true" />
                Prior period
              </span>
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 sm:p-6 lg:col-span-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-body font-bold text-fg">FX health &amp; exposure</h2>
                <p className="text-caption text-muted-fg">
                  Exchange snapshot &amp; pending withdrawal exposure
                </p>
              </div>
              <span
                className={cn(
                  "text-caption font-semibold capitalize",
                  fxHealth?.ok ? "text-success" : "text-danger",
                )}
              >
                {fxHealth ? String(fxHealth.status || "unknown") : "Loading"}
              </span>
            </div>

            {!fxHealth ? (
              <p className="text-label text-muted-fg">Loading FX snapshot…</p>
            ) : (
              <dl className="divide-y divide-line text-label">
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-fg">Source</dt>
                  <dd className="font-medium text-fg">{fxHealth.source || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-fg">Base / Rates</dt>
                  <dd className="font-medium tabular-nums text-fg">
                    {fxHealth.base || "—"} · {fxHealth.rateCount ?? 0} pairs
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-fg">Updated</dt>
                  <dd className="text-right tabular-nums text-fg">
                    {fxHealth.fetchedAt
                      ? new Date(fxHealth.fetchedAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-fg">Pending payouts</dt>
                  <dd className="text-right font-semibold tabular-nums text-fg">
                    {fxHealth.pendingWithdrawals?.byCurrency &&
                    Object.keys(fxHealth.pendingWithdrawals.byCurrency).length > 0
                      ? Object.entries(
                          fxHealth.pendingWithdrawals.byCurrency as Record<
                            string,
                            { count: number; amount: number }
                          >,
                        )
                          .map(
                            ([currency, v]) =>
                              `${formatCurrency(Number(v.amount || 0), currency)} (${v.count})`,
                          )
                          .join(" · ")
                      : "None"}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        {/* Rankings & Recent Audit Trail */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <BarChart3 className="size-4 text-fg" aria-hidden="true" />
              <h2 className="text-body font-bold text-fg">Top earners</h2>
            </div>
            <div className="space-y-5">
              {topEarnerGroups.map((group) => (
                <div key={group.currency} className="space-y-2">
                  <p className="text-caption font-semibold text-muted-fg">
                    {group.currency}
                  </p>
                  {group.earners.map((creator, i) => {
                    const field = totalEarningsField(group.currency);
                    return (
                      <RankRow
                        key={`${group.currency}-${creator.id}`}
                        rank={i + 1}
                        name={creator.name || creator.id}
                        subText={formatCurrency(
                          Number(creator[field] ?? 0),
                          group.currency,
                        )}
                      />
                    );
                  })}
                </div>
              ))}
              {topEarnerGroups.length === 0 && (
                <p className="py-6 text-center text-label text-muted-fg">
                  No creator earnings recorded yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <Eye className="size-4 text-brand-strong" aria-hidden="true" />
              <h2 className="text-body font-bold text-fg">Most viewed creators</h2>
            </div>
            <div className="space-y-3">
              {topViewed.map((creator, i) => (
                <RankRow
                  key={creator.id}
                  rank={i + 1}
                  name={creator.name || creator.id}
                  subText={`${Number(creator.views || 0).toLocaleString()} views`}
                />
              ))}
              {topViewed.length === 0 && (
                <p className="py-6 text-center text-label text-muted-fg">
                  No view data yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Activity className="size-4 text-success" aria-hidden="true" />
                <h2 className="text-body font-bold text-fg">Recent activity</h2>
              </div>
              <Link
                href="/admin/logs"
                className="text-caption font-semibold text-brand-strong hover:underline"
              >
                All logs
              </Link>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {recentActivities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                  <p className="truncate text-label text-fg">{activity.message}</p>
                  <p className="mt-0.5 text-caption tabular-nums text-muted-fg">
                    {activity.category ? `${activity.category} · ` : ""}
                    {toDateSafe(activity.createdAt)?.toLocaleTimeString() || "Now"}
                  </p>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="py-6 text-center text-label text-muted-fg">
                  No recent activity.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog
        open={!!modal}
        onClose={() => {
          if (!processing) {
            setModal(null);
            setRejectionReason("");
          }
        }}
        title={
          modal
            ? `${modal.type === "approve" ? "Approve" : "Reject"} ${modal.category}`
            : "Confirm action"
        }
        description={
          modal
            ? `${modal.target.name || modal.target.creatorName || "User"}`
            : undefined
        }
        size="sm"
        footer={
          modal ? (
            <>
              <Button
                variant="secondary"
                disabled={processing}
                onClick={() => {
                  setModal(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant={modal.type === "approve" ? "primary" : "danger"}
                loading={processing}
                onClick={() => void handleAction()}
              >
                {modal.type === "approve" ? "Approve" : "Reject"}
              </Button>
            </>
          ) : undefined
        }
      >
        {modal && (
          <div className="space-y-4">
            <p className="text-label text-muted-fg">
              Confirm whether you want to {modal.type} this {modal.category} request for{" "}
              <span className="font-semibold text-fg">
                {modal.target.name || modal.target.creatorName || "this user"}
              </span>
              .
            </p>
            {modal.type === "reject" && (
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-fg">
                  Reason (sent to creator)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Identity document image is unreadable."
                  rows={3}
                  className="w-full rounded-control border border-line bg-surface p-3 text-label text-fg outline-none focus:border-focus"
                />
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
