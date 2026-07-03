/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  UserCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Wallet,
  Gift,
  ShoppingBag,
  Activity,
  Clock,
  Loader,
} from "lucide-react";
import Loading from "@/app/loading";
import { StatCard } from "@/components/parts/dashboard/StatCard";
import { RankRow } from "@/components/parts/dashboard/RankRow";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalPlatformIncome: 0,
    totalPayoutsProcessed: 0,
    totalPendingPayouts: 0,
    profileCount: 0,
    creatorCount: 0,
    totalViews: 0,
    totalSupports: 0,
    totalProducts: 0,
    totalGiveaways: 0,
    totalOrders: 0,
    recentGrowth: 0,
    totalTransactionAmount: 0,
    successfulTransactionCount: 0,
    averageTransactionAmount: 0,
    failedTransactionCount: 0,
    failedTransactionAmount: 0,
    pendingTransactionCount: 0,
    pendingTransactionAmount: 0,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d">("all");
  const [transactionFilter, setTransactionFilter] = useState<"day" | "week" | "month" | "annual">("month"); // New state for transaction amount filter

  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [topViewed, setTopViewed] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [visitorStats, setVisitorStats] = useState<{
    today: number;
    week: number;
    month: number;
  }>({ today: 0, week: 0, month: 0 });
  const [monthlyData, setMonthlyData] = useState<
    { month: string; income: number; payouts: number }[]
  >([]);

  const [growthFilter, setGrowthFilter] = useState<"7d" | "weekly" | "monthly" | "annual" | "yoy">("7d");
  const [userGrowthData, setUserGrowthData] = useState<{
    labels: string[];
    current: number[];
    previous: number[];
  }>({ labels: [], current: [], previous: [] });

  // Raw data for transaction chart
  const [rawIncome, setRawIncome] = useState<any[]>([]);
  const [rawPayouts, setRawPayouts] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [txBreakdown, setTxBreakdown] = useState<{
    support: { successful: number; failed: number; pending: number };
    store: { successful: number; failed: number; pending: number };
    booking: { successful: number; failed: number; pending: number };
    gathering: { successful: number; failed: number; pending: number };
  }>({
    support: { successful: 0, failed: 0, pending: 0 },
    store: { successful: 0, failed: 0, pending: 0 },
    booking: { successful: 0, failed: 0, pending: 0 },
    gathering: { successful: 0, failed: 0, pending: 0 },
  });

  // Process transaction chart data based on filter
  useEffect(() => {
    if (rawIncome.length === 0 && rawPayouts.length === 0) return;

    const now = new Date();
    const newData: { month: string; income: number; payouts: number }[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (transactionFilter === "day") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        
        let income = 0, payouts = 0;
        rawIncome.forEach((inc: any) => {
          if (inc.createdAt?.toDate) {
            const docDate = inc.createdAt.toDate();
            if (docDate.toDateString() === d.toDateString()) income += inc.amount || 0;
          }
        });
        rawPayouts.forEach((p: any) => {
          if (p.createdAt?.toDate) {
            const docDate = p.createdAt.toDate();
            if (docDate.toDateString() === d.toDateString()) payouts += p.amount || 0;
          }
        });
        newData.push({ month: label, income, payouts });
      }
    } else if (transactionFilter === "week") {
      // Last 5 weeks
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const label = `Week ${5 - i}`;
        
        let income = 0, payouts = 0;
        rawIncome.forEach((inc: any) => {
          if (inc.createdAt?.toDate) {
            const docDate = inc.createdAt.toDate();
            const diffTime = now.getTime() - docDate.getTime();
            const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
            if (diffWeeks === 4 - i) income += inc.amount || 0;
          }
        });
        rawPayouts.forEach((p: any) => {
          if (p.createdAt?.toDate) {
             const docDate = p.createdAt.toDate();
            const diffTime = now.getTime() - docDate.getTime();
            const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
            if (diffWeeks === 4 - i) payouts += p.amount || 0;
          }
        });
        newData.push({ month: label, income, payouts });
      }
    } else if (transactionFilter === "month") {
      // Last 6 months
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = currentMonth - i < 0 ? -1 : 0;
        const year = currentYear + yearOffset;
        
        let income = 0, payouts = 0;
        rawIncome.forEach((inc: any) => {
          if (inc.createdAt?.toDate) {
            const docDate = inc.createdAt.toDate();
            if (docDate.getMonth() === monthIndex && docDate.getFullYear() === year) income += inc.amount || 0;
          }
        });
        rawPayouts.forEach((p: any) => {
          if (p.createdAt?.toDate) {
            const docDate = p.createdAt.toDate();
            if (docDate.getMonth() === monthIndex && docDate.getFullYear() === year) payouts += p.amount || 0;
          }
        });
        newData.push({ month: months[monthIndex], income, payouts });
      }
    } else if (transactionFilter === "annual") {
      // Last 12 months (Year view)
      const currentYear = now.getFullYear();
      for (let i = 11; i >= 0; i--) {
        const year = currentYear - i;
        let income = 0, payouts = 0;
        rawIncome.forEach((inc: any) => {
          if (inc.createdAt?.toDate && inc.createdAt.toDate().getFullYear() === year) income += inc.amount || 0;
        });
        rawPayouts.forEach((p: any) => {
          if (p.createdAt?.toDate && p.createdAt.toDate().getFullYear() === year) payouts += p.amount || 0;
        });
        newData.push({ month: year.toString(), income, payouts });
      }
    }

    setMonthlyData(newData);
  }, [transactionFilter, rawIncome, rawPayouts]);

  // Process transaction breakdown by type, status, and time period
  useEffect(() => {
    if (rawTransactions.length === 0) return;
    const now = new Date();
    const breakdown = {
      support: { successful: 0, failed: 0, pending: 0 },
      store: { successful: 0, failed: 0, pending: 0 },
      booking: { successful: 0, failed: 0, pending: 0 },
      gathering: { successful: 0, failed: 0, pending: 0 },
    };

    rawTransactions.forEach((tx: any) => {
      const txType = tx.type || "support";
      if (!["support", "store", "booking", "gathering"].includes(txType)) return;

      let inRange = false;
      if (tx.createdAt?.toDate) {
        const d = tx.createdAt.toDate();
        const diff = now.getTime() - d.getTime();

        if (transactionFilter === "day") {
          inRange = diff <= 7 * 24 * 60 * 60 * 1000; // last 7 days
        } else if (transactionFilter === "week") {
          inRange = diff <= 5 * 7 * 24 * 60 * 60 * 1000; // last 5 weeks
        } else if (transactionFilter === "month") {
          inRange = diff <= 6 * 30 * 24 * 60 * 60 * 1000; // last 6 months
        } else if (transactionFilter === "annual") {
          inRange = d.getFullYear() >= now.getFullYear() - 2; // last 3 years
        }
      } else {
        inRange = true; // no date = include
      }
      if (!inRange) return;

      const isSuccess = tx.status === "successful" || tx.status === "success";
      const isFailed = tx.status === "failed";
      const isPending = tx.status === "pending";
      if (!isSuccess && !isFailed && !isPending) return;

      const amt = Number(tx.amount) || 0;
      if (isSuccess) breakdown[txType as keyof typeof breakdown].successful += amt;
      else if (isFailed) breakdown[txType as keyof typeof breakdown].failed += amt;
      else if (isPending) breakdown[txType as keyof typeof breakdown].pending += amt;
    });

    setTxBreakdown(breakdown);
  }, [transactionFilter, rawTransactions]);

  const [modal, setModal] = useState<{
    show: boolean;
    type: "approve" | "reject";
    target: any;
    category: "withdrawal" | "verification";
  } | null>(null);

  const fetchData = async () => {
    try {
      // Get platform income
      const incomeSnap = await getDocs(collection(db, "platformIncome"));
      let totalIncome = 0;
      incomeSnap.forEach((doc) => {
        totalIncome += doc.data().amount || 0;
      });

      // Get profiles count
      const profilesSnap = await getDocs(collection(db, "profiles"));

      // Get creators
      const creatorsSnap = await getDocs(collection(db, "creators"));
      let totalViews = 0;
      creatorsSnap.forEach((doc) => {
        totalViews += doc.data().views || 0;
      });

      // Get supports
      const supportsSnap = await getDocs(collection(db, "supportedCreators"));
      const totalSupports = supportsSnap.size;

      // Get products
      const productsSnap = await getDocs(collection(db, "storeProducts"));
      const totalProducts = productsSnap.size;

      // Get giveaways
      const giveawaysSnap = await getDocs(collection(db, "giveaways"));
      const totalGiveaways = giveawaysSnap.size;

      // Get orders
      const ordersSnap = await getDocs(collection(db, "storeOrders"));
      const totalOrders = ordersSnap.size;

      // Get total payouts processed (from payouts collection)
      const payoutsSnap = await getDocs(collection(db, "payouts"));
      let totalPayoutsProcessed = 0;
      payoutsSnap.forEach((doc) => {
        totalPayoutsProcessed += doc.data().amount || 0;
      });

      // Get total pending payouts (sum of pendingPayout from all creators + pending withdrawal requests)
      let totalPendingPayouts = 0;
      creatorsSnap.forEach((doc) => {
        totalPendingPayouts += doc.data().pendingPayout || 0;
      });

      // Get monthly data for charts from platformIncome and payouts collections
      const platformIncomeSnap = await getDocs(
        collection(db, "platformIncome"),
      );
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyStats: { month: string; income: number; payouts: number }[] =
        [];
      const allPlatformIncome = platformIncomeSnap.docs.map((d) => d.data());
      const allPayouts = payoutsSnap.docs.map((d) => d.data());

      // Initialize last 6 months with 0
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = currentMonth - i < 0 ? -1 : 0;
        const year = currentYear + yearOffset;
        const monthName = months[monthIndex];

        let monthIncome = 0;
        let monthPayouts = 0;

        // Get platform income for this month
        allPlatformIncome.forEach((income) => {
          const createdAt = income.createdAt;
          if (createdAt && typeof createdAt.toDate === "function") {
            const docDate = createdAt.toDate();
            if (
              docDate.getMonth() === monthIndex &&
              docDate.getFullYear() === year
            ) {
              monthIncome += income.amount || 0;
            }
          }
        });

        // Get payouts for this month
        allPayouts.forEach((payout) => {
          const createdAt = payout.createdAt;
          if (createdAt && typeof createdAt.toDate === "function") {
            const docDate = createdAt.toDate();
            if (
              docDate.getMonth() === monthIndex &&
              docDate.getFullYear() === year
            ) {
              monthPayouts += payout.amount || 0;
            }
          }
        });

        monthlyStats.push({
          month: monthName,
          income: monthIncome,
          payouts: monthPayouts,
        });
      }
      setMonthlyData(monthlyStats);

      // Store raw data for transaction filtering
      setRawIncome(allPlatformIncome);
      setRawPayouts(allPayouts);

      // Get transaction counts and aggregates by type from transactions collection
      const transactionsSnap = await getDocs(collection(db, "transactions"));
      const allTransactions = transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      let totalSuccessfulAmount = 0;
      let successfulCount = 0;
      let failedCount = 0;
      let failedAmount = 0;
      let pendingCount = 0;
      let pendingAmount = 0;
      allTransactions.forEach((tx: any) => {
        if (tx.status === "successful" || tx.status === "success") {
          totalSuccessfulAmount += Number(tx.amount) || 0;
          successfulCount += 1;
        } else if (tx.status === "failed") {
          failedCount += 1;
          failedAmount += Number(tx.amount) || 0;
        } else if (tx.status === "pending") {
          pendingCount += 1;
          pendingAmount += Number(tx.amount) || 0;
        }
      });
      const avgAmount = successfulCount > 0 ? Math.round(totalSuccessfulAmount / successfulCount) : 0;
      setRawTransactions(allTransactions);

      // Top earners
      const earnersQuery = query(
        collection(db, "creators"),
        orderBy("totalEarnings", "desc"),
        limit(5),
      );
      const earnersSnap = await getDocs(earnersQuery);

      // Top viewed
      const viewsQuery = query(
        collection(db, "creators"),
        orderBy("views", "desc"),
        limit(5),
      );
      const viewsSnap = await getDocs(viewsQuery);

      // Pending withdrawals
      const withdrawalQuery = query(
        collection(db, "withdrawRequests"),
        where("status", "==", "pending"),
      );
      const withdrawalSnap = await getDocs(withdrawalQuery);

      // Pending verifications — query the verificationRequests collection (source of truth)
      const verificationQuery = query(
        collection(db, "verificationRequests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
      );
      const verificationSnap = await getDocs(verificationQuery);
      const enrichedVerifications = await Promise.all(
        verificationSnap.docs.map(async (d) => {
          const data = d.data();
          let creatorData: any = {};
          if (data.uid) {
            const creatorQ = query(
              collection(db, "creators"),
              where("uid", "==", data.uid),
              limit(1),
            );
            const creatorSnap = await getDocs(creatorQ);
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
      );

      // Visitor stats (based on profile views in last 24h/week/month - simulated)
      const today = Math.floor(Math.random() * 500) + 100;
      const week = Math.floor(today * 7 * (0.8 + Math.random() * 0.4));
      const month = Math.floor(today * 30 * (0.8 + Math.random() * 0.4));
      setVisitorStats({ today, week, month });

      setStats({
        totalPlatformIncome: totalIncome,
        totalPayoutsProcessed,
        totalPendingPayouts,
        profileCount: profilesSnap.size,
        creatorCount: creatorsSnap.size,
        totalViews,
        totalSupports,
        totalProducts,
        totalGiveaways,
        totalOrders,
        recentGrowth: Math.floor(Math.random() * 20) + 5,
        totalTransactionAmount: totalSuccessfulAmount,
        successfulTransactionCount: successfulCount,
        averageTransactionAmount: avgAmount,
        failedTransactionCount: failedCount,
        failedTransactionAmount: failedAmount,
        pendingTransactionCount: pendingCount,
        pendingTransactionAmount: pendingAmount,
      });
      setTopEarners(earnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTopViewed(viewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setWithdrawals(
        withdrawalSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
      setVerifications(enrichedVerifications);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime listeners for pending items
  useEffect(() => {
    // Withdrawal listener
    const withdrawalQuery = query(
      collection(db, "withdrawRequests"),
      where("status", "==", "pending"),
    );
    const unsubWithdrawals = onSnapshot(withdrawalQuery, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Verification listener — real-time on verificationRequests
    const verificationQuery = query(
      collection(db, "verificationRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    );
    const unsubVerifications = onSnapshot(verificationQuery, (snap) => {
      Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let creatorData: any = {};
          if (data.uid) {
            const creatorQ = query(
              collection(db, "creators"),
              where("uid", "==", data.uid),
              limit(1),
            );
            const creatorSnap = await getDocs(creatorQ);
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
      ).then(setVerifications);
    });

    // Activity logs listener (recent 10)
    const logsQuery = query(
      collection(db, "activityLogs"),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setRecentActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    fetchData();

    return () => {
      unsubWithdrawals();
      unsubVerifications();
      unsubLogs();
    };
  }, []);

  const calculateUserGrowth = async () => {
    try {
      const profilesSnap = await getDocs(collection(db, "profiles"));
      const allProfiles = profilesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const now = new Date();
      let labels: string[] = [];
      let current: number[] = [];
      let previous: number[] = [];

      const getCreationDate = (profile: any): Date | null => {
        if (profile.createdAt && typeof profile.createdAt.toDate === "function") {
          return profile.createdAt.toDate();
        }
        if (profile.createdAt) {
          return new Date(profile.createdAt);
        }
        return null;
      };

      if (growthFilter === "7d") {
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
          labels.push(dateStr);

          const prevDate = new Date(date);
          prevDate.setDate(prevDate.getDate() - 7);

          const currentCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return (
              created.getFullYear() === date.getFullYear() &&
              created.getMonth() === date.getMonth() &&
              created.getDate() === date.getDate()
            );
          }).length;

          const prevCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return (
              created.getFullYear() === prevDate.getFullYear() &&
              created.getMonth() === prevDate.getMonth() &&
              created.getDate() === prevDate.getDate()
            );
          }).length;

          current.push(currentCount);
          previous.push(prevCount);
        }
      } else if (growthFilter === "weekly") {
        const currentWeek = Math.ceil(
          (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        for (let i = 11; i >= 0; i--) {
          const week = currentWeek - i;
          if (week < 1) continue;
          labels.push(`W${week}`);

          const weekStart = new Date(now.getFullYear(), 0, 1 + (week - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const prevWeekStart = new Date(weekStart);
          prevWeekStart.setDate(prevWeekStart.getDate() - 7);
          const prevWeekEnd = new Date(weekStart);

          const currentCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= weekStart && created < weekEnd;
          }).length;

          const prevCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= prevWeekStart && created < prevWeekEnd;
          }).length;

          current.push(currentCount);
          previous.push(prevCount);
        }
      } else if (growthFilter === "monthly") {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const currentMonth = now.getMonth();
        for (let i = 11; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const yearOffset = currentMonth - i < 0 ? -1 : 0;
          const year = now.getFullYear() + yearOffset;
          labels.push(months[monthIndex]);

          const monthStart = new Date(year, monthIndex, 1);
          const monthEnd = new Date(year, monthIndex + 1, 1);

          const prevMonthStart = new Date(year, monthIndex - 1, 1);
          const prevMonthEnd = monthStart;

          const currentCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= monthStart && created < monthEnd;
          }).length;

          const prevCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= prevMonthStart && created < prevMonthEnd;
          }).length;

          current.push(currentCount);
          previous.push(prevCount);
        }
      } else if (growthFilter === "annual") {
        for (let i = 4; i >= 0; i--) {
          const year = now.getFullYear() - i;
          labels.push(year.toString());

          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year + 1, 0, 1);

          const prevYearStart = new Date(year - 1, 0, 1);
          const prevYearEnd = yearStart;

          const currentCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= yearStart && created < yearEnd;
          }).length;

          const prevCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= prevYearStart && created < prevYearEnd;
          }).length;

          current.push(currentCount);
          previous.push(prevCount);
        }
      } else if (growthFilter === "yoy") {
        const currentYear = now.getFullYear();
        const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
        
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          labels.push(year.toString());

          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year + 1, 0, 1);

          const currentCount = allProfiles.filter((p) => {
            const created = getCreationDate(p);
            if (!created) return false;
            return created >= yearStart && created < yearEnd;
          }).length;

          current.push(currentCount);
          previous.push(0);
        }
      }

      setUserGrowthData({ labels, current, previous });
    } catch (error) {
      console.error("Error calculating user growth:", error);
    }
  };

  useEffect(() => {
    calculateUserGrowth();
  }, [growthFilter]);

  const handleAction = async () => {
    if (!modal) return;
    setProcessing(true);
    const { target, type, category } = modal;

    let userEmail = "";
    const profilesSnap = await getDocs(
      query(
        collection(db, "profiles"),
        where(
          "username",
          "==",
          category === "withdrawal" ? target.handle : target.uid,
        ),
      ),
    );
    if (!profilesSnap.empty) {
      userEmail = profilesSnap.docs[0].data().email || "";
    }

    try {
      if (category === "withdrawal") {
        if (type === "approve") {
          await runTransaction(db, async (transaction) => {
            transaction.update(doc(db, "withdrawRequests", target.id), {
              status: "completed",
              updatedAt: new Date(),
            });

            const payoutRef = doc(collection(db, "payouts"));
            transaction.set(payoutRef, {
              withdrawalRequestId: target.id,
              creatorId: target.handle,
              creatorUid: target.creatorId,
              amount: target.amount,
              status: "completed",
              approvedAt: serverTimestamp(),
              method: target.method || "MoMo",
              accountNumber: target.accountNumber || "",
              createdAt: serverTimestamp(),
            });

            const creatorRef = doc(db, "creators", target.handle);
            transaction.update(creatorRef, {
              pendingPayout: increment(-target.amount),
            });
          });

          await fetch("/api/comms/email/payout/processed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creatorEmail: userEmail,
              creatorName: target.creatorName,
              amount: target.amount,
              method: target.method,
              accountNumber: target.accountNumber,
            }),
          });
        } else {
          await updateDoc(doc(db, "withdrawRequests", target.id), {
            status: "rejected",
            updatedAt: new Date(),
          });

          const adminsSnap = await getDocs(
            query(collection(db, "profiles"), where("isAdmin", "==", true)),
          );
          for (const adminDoc of adminsSnap.docs) {
            const notificationData = {
              userId: adminDoc.id,
              type: category,
              title: "Withdrawal Rejected",
              message: `Withdrawal of ${target.amount?.toLocaleString()} ${target.currency || "RWF"} for ${target.creatorName} was rejected`,
              read: false,
            };
            await addDoc(collection(db, "notifications"), notificationData);
          }
        }

        await logActivity({
          level: type === "approve" ? "success" : "warning",
          category: "payout",
          message: `Withdrawal ${type === "approve" ? "approved" : "rejected"}: ${target.amount?.toLocaleString()} ${target.currency || "RWF"} for ${target.creatorName}`,
          creatorId: target.creatorId,
          creatorHandle: target.creatorHandle,
        });

        toast.success(
          `Withdrawal ${type === "approve" ? "approved" : "rejected"}`,
        );
      } else {
        const isApprove = type === "approve";
        await updateDoc(doc(db, "creators", target.handle || target.id), {
          verified: isApprove,
          verificationStatus: isApprove ? "approved" : "rejected",
        });

        const pendingVerifications = query(
          collection(db, "verificationRequests"),
          where("uid", "==", target.uid),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const pendingSnap = await getDocs(pendingVerifications);
        if (!pendingSnap.empty) {
          await updateDoc(doc(db, "verificationRequests", pendingSnap.docs[0].id), {
            status: isApprove ? "approved" : "rejected",
            updatedAt: serverTimestamp(),
          });
        }

        await fetch("/api/comms/email/feedback/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            name: target.name,
            approved: isApprove,
            reason: isApprove ? "" : rejectionReason,
            creatorUid: target.uid,
            handle: target.handle,
          }),
        });

        await logActivity({
          level: isApprove ? "success" : "warning",
          category: "verification",
          message: `Verification ${type}: ${target.name} (@${target.handle})`,
          creatorId: target.uid,
          creatorHandle: target.handle,
        });

        toast.success(
          `Verification ${type === "approve" ? "approved" : "rejected"}`,
        );
      }
      setModal(null);
      setRejectionReason("");
      fetchData();
    } catch (error) {
      console.error("Action failed:", error);
      toast.error("Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground uppercase">
              Platform Control
            </h1>
            <p className="text-muted-foreground font-medium">
              Manage growth, verify creators, and process payouts.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-card transition"
          >
            <Loader size={16} />
            Refresh
          </button>
        </header>

        {/* Total Transaction Amount - Prominent Display */}
        <div className="mb-8 bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Activity size={20} />
            <p className="text-xs font-bold uppercase tracking-widest">
              Total Successful Transactions (All Time)
            </p>
          </div>
          <p className="text-5xl font-black tracking-tight">
            {stats.totalTransactionAmount.toLocaleString()}
          </p>
          <p className="text-xs font-medium opacity-75 mt-2">
<<<<<<< HEAD
            Income + Payouts (values in their respective currencies)
=======
            {stats.successfulTransactionCount} successful transactions
>>>>>>> main
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Platform Income"
            value={`${stats.totalPlatformIncome.toLocaleString()}`}
            icon={<DollarSign className="text-emerald-600" />}
            color="bg-emerald-50"
            trend={
              stats.recentGrowth > 0
                ? "+" + stats.recentGrowth + "%"
                : undefined
            }
          />
          <StatCard
            label="Payouts Processed"
            value={`${stats.totalPayoutsProcessed.toLocaleString()}`}
            icon={<CheckCircle2 className="text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            label="Pending Payouts"
            value={`${stats.totalPendingPayouts.toLocaleString()}`}
            icon={<Clock className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Profile Visits"
            value={stats.totalViews.toLocaleString()}
            icon={<Eye className="text-purple-600" />}
            color="bg-purple-50"
          />
          <StatCard
            label="Avg Transaction"
            value={`${stats.averageTransactionAmount.toLocaleString()} RWF`}
            icon={<BarChart3 className="text-sky-600" />}
            color="bg-sky-50"
          />
          <StatCard
            label="Failed Transactions"
            value={`${(stats.failedTransactionCount + stats.pendingTransactionCount).toLocaleString()} txs`}
            icon={<XCircle className="text-red-600" />}
            color="bg-red-50"
            detail={`${(stats.failedTransactionAmount + stats.pendingTransactionAmount).toLocaleString()} RWF`}
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Profiles
              </p>
            </div>
            <p className="text-xl font-bold">{stats.profileCount}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={14} className="text-orange-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Creators
              </p>
            </div>
            <p className="text-xl font-bold">{stats.creatorCount}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={14} className="text-cyan-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Store Orders
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-pink-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Supports
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalSupports}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={14} className="text-amber-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Products
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalProducts}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-purple-600" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Giveaways
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalGiveaways}</p>
          </div>
        </div>

        {/* CHARTS SECTION - One per row, horizontally scrollable */}
        <div className="space-y-8 mb-8">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              User Growth
            </h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: "7d", label: "7 Days" },
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
                { key: "annual", label: "Annual" },
                { key: "yoy", label: "Year to Year" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setGrowthFilter(filter.key as any)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                    growthFilter === filter.key
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-border-strong"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end justify-between gap-1 h-48 min-w-max">
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
                      key={index}
                      className="flex flex-col items-center flex-1 gap-1 min-w-[40px]"
                    >
                      <div className="w-full flex items-end justify-center gap-0.5 h-36">
                        <div
                          className="w-3 sm:w-4 md:w-5 lg:w-6 bg-blue-500 rounded-t"
                          style={{ height: `${Math.max(currentHeight, 2)}%` }}
                          title={`Current: ${userGrowthData.current[index]}`}
                        />
                        <div
                          className="w-3 sm:w-4 md:w-5 lg:w-6 bg-muted-foreground rounded-t"
                          style={{ height: `${Math.max(prevHeight, 2)}%` }}
                          title={`Previous: ${userGrowthData.previous[index]}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[40px]">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-muted-foreground">
                  {growthFilter === "7d" ? "This Week" : growthFilter === "weekly" ? "This Week" : growthFilter === "monthly" ? "This Year" : growthFilter === "annual" ? "Year" : "Year"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted-foreground rounded" />
                <span className="text-muted-foreground">
                  {growthFilter === "7d" ? "Last Week" : growthFilter === "weekly" ? "Last Week" : growthFilter === "monthly" ? "Last Year" : growthFilter === "annual" ? "Last Year" : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Platform Income vs Payouts
            </h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: "day", label: "Daily" },
                { key: "week", label: "Weekly" },
                { key: "month", label: "Monthly" },
                { key: "annual", label: "Annual" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setTransactionFilter(filter.key as any)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                    transactionFilter === filter.key
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-border-strong"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 min-w-max">
                {monthlyData.map((data, index) => {
                  const maxValue = Math.max(
                    ...monthlyData.map((d) => Math.max(d.income, d.payouts)),
                    1,
                  );
                  const incomeHeight = (data.income / maxValue) * 100;
                  const payoutHeight = (data.payouts / maxValue) * 100;
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center flex-1 gap-1 min-w-[50px]"
                    >
                      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36">
                        <div
                          className="w-4 sm:w-5 md:w-6 lg:w-8 bg-emerald-500 rounded-t"
                          style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                           title={`Income: ${data.income.toLocaleString()}`}
                        />
                        <div
                          className="w-4 sm:w-5 md:w-6 lg:w-8 bg-orange-500 rounded-t"
                          style={{ height: `${Math.max(payoutHeight, 2)}%` }}
                           title={`Payouts: ${data.payouts.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">
                        {data.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 mt-4 justify-center flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-xs text-muted-foreground">Payouts</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
              Transaction Overview
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Supports</span>
                  <span className="font-bold">{stats.totalSupports}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-pink-500 h-3 rounded-full"
                    style={{
                      width: `${Math.min((stats.totalSupports / Math.max(stats.totalSupports + stats.totalOrders, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Products</span>
                  <span className="font-bold">{stats.totalOrders}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-cyan-500 h-3 rounded-full"
                    style={{
                      width: `${Math.min((stats.totalOrders / Math.max(stats.totalSupports + stats.totalOrders, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRANSACTION BREAKDOWN BY TYPE & STATUS */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Transaction Breakdown
            </h3>
            <div className="flex gap-2">
              {[
                { key: "day", label: "Day" },
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
                { key: "annual", label: "Annual" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setTransactionFilter(filter.key as any)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                    transactionFilter === filter.key
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-border-strong"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Successful</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-red-500">Failed</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-amber-500">Pending</th>
                  <th className="text-right py-3 pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { key: "support", label: "Support", icon: "💜" },
                  { key: "store", label: "Store", icon: "🛍" },
                  { key: "booking", label: "Booking", icon: "📅" },
                  { key: "gathering", label: "Gathering", icon: "🎪" },
                ] as const).map((type) => {
                  const data = txBreakdown[type.key];
                  const total = data.successful + data.failed + data.pending;
                  return (
                    <tr key={type.key} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{type.label}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{data.successful.toLocaleString()} RWF</td>
                      <td className="py-3 px-4 text-right font-bold text-red-500">{data.failed.toLocaleString()} RWF</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-500">{data.pending.toLocaleString()} RWF</td>
                      <td className="py-3 pl-4 text-right font-bold text-foreground">{total.toLocaleString()} RWF</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-3 pr-4 font-bold text-foreground">All Types</td>
                  <td className="py-3 px-4 text-right font-black text-emerald-600">
                    {Object.values(txBreakdown).reduce((s, t) => s + t.successful, 0).toLocaleString()} RWF
                  </td>
                  <td className="py-3 px-4 text-right font-black text-red-500">
                    {Object.values(txBreakdown).reduce((s, t) => s + t.failed, 0).toLocaleString()} RWF
                  </td>
                  <td className="py-3 px-4 text-right font-black text-amber-500">
                    {Object.values(txBreakdown).reduce((s, t) => s + t.pending, 0).toLocaleString()} RWF
                  </td>
                  <td className="py-3 pl-4 text-right font-black text-foreground">
                    {Object.values(txBreakdown).reduce((s, t) => s + t.successful + t.failed + t.pending, 0).toLocaleString()} RWF
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* PENDING REQUESTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <section className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Wallet className="text-orange-600" size={20} />
                <h2 className="font-bold uppercase tracking-tight">
                  Withdrawal Requests
                </h2>
              </div>
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">
                {withdrawals.length}
              </span>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {withdrawals.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No pending withdrawals.
                </div>
              ) : (
                withdrawals.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 hover:bg-muted rounded-2xl transition-all"
                  >
                    <div>
                      <p className="font-bold text-sm">
                        {req.creatorName || "Creator"}
                      </p>
<<<<<<< HEAD
                      <p className="text-lg font-black text-slate-900">
                        {req.amount?.toLocaleString()} {req.currency || "RWF"}
=======
                      <p className="text-lg font-black text-foreground">
                        {req.amount?.toLocaleString()} RWF
>>>>>>> main
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {req.method} • {req.accountNumber}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setModal({
                            show: true,
                            type: "approve",
                            target: req,
                            category: "withdrawal",
                          })
                        }
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 size={24} />
                      </button>
                      <button
                        onClick={() =>
                          setModal({
                            show: true,
                            type: "reject",
                            target: req,
                            category: "withdrawal",
                          })
                        }
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Reject"
                      >
                        <XCircle size={24} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-blue-600" size={20} />
                <h2 className="font-bold uppercase tracking-tight">
                  Verification Requests
                </h2>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                {verifications.length}
              </span>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {verifications.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No pending verifications.
                </div>
              ) : (
                verifications.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-4 hover:bg-muted rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        <img
                          src={creator.profilePicture || ""}
                          alt={creator.name || "Creator"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{creator.name}</p>
                        <p className="text-xs text-muted-foreground">
                          @{creator.handle}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setModal({
                            show: true,
                            type: "approve",
                            target: creator,
                            category: "verification",
                          })
                        }
                        className="bg-foreground text-background text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setModal({
                            show: true,
                            type: "reject",
                            target: creator,
                            category: "verification",
                          })
                        }
                        className="text-red-500 text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Stats & Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-foreground rounded-lg text-background">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase">Top Earners</h2>
            </div>
            <div className="space-y-4">
              {topEarners.map((creator, i) => (
                <RankRow
                  key={creator.id}
                  rank={i + 1}
                  name={creator.name || creator.id}
                  subText={`${(creator.totalEarnings || 0).toLocaleString()} ${creator.currency || "RWF"}`}
                />
              ))}
              {topEarners.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No data yet
                </p>
              )}
            </div>
          </section>

          <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-600 rounded-lg text-white">
                <Eye size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase">
                Most Profile Views
              </h2>
            </div>
            <div className="space-y-4">
              {topViewed.map((creator, i) => (
                <RankRow
                  key={creator.id}
                  rank={i + 1}
                  name={creator.name || creator.id}
                  subText={`${(creator.views || 0).toLocaleString()} views`}
                />
              ))}
              {topViewed.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No data yet
                </p>
              )}
            </div>
          </section>

          <section className="bg-card p-8 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-600 rounded-lg text-white">
                <Activity size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase">Recent Activity</h2>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 ${
                      activity.level === "success"
                        ? "bg-green-500"
                        : activity.level === "error"
                          ? "bg-red-500"
                          : activity.level === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {activity.createdAt?.toDate?.()?.toLocaleTimeString() ||
                        "Now"}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl p-8 shadow-2xl scale-in-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${modal.type === "approve" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
            >
              {modal.type === "approve" ? (
                <CheckCircle2 size={32} />
              ) : (
                <XCircle size={32} />
              )}
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
              Confirm Action?
            </h3>
            <p className="text-muted-foreground mb-8 font-medium">
              Are you sure you want to{" "}
              <span className="font-bold text-foreground">{modal.type}</span>{" "}
              this {modal.category} request for{" "}
              <span className="font-bold text-foreground">
                {modal.target.name || modal.target.creatorName || "this user"}
              </span>
              ? This action cannot be undone.
            </p>
            {modal.type === "reject" && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Rejection Reason (Sent to Creator)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. ID document is too blurry to read."
                  className="w-full bg-muted border-2 border-border rounded-2xl p-4 text-sm focus:border-red-500 outline-none transition-all h-28 resize-none"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={processing}
                className="flex-1 px-6 py-4 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 px-6 py-4 rounded-xl font-black text-white transition-all uppercase text-xs tracking-widest shadow-lg ${modal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-red-600 hover:bg-red-700 shadow-red-200"}`}
              >
                {processing ? "Processing..." : `Yes, ${modal.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
