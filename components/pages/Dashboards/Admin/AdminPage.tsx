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
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d">("all");

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

      // Get transaction counts by type from transactions collection
      const transactionsSnap = await getDocs(collection(db, "transactions"));
      const allTransactions = transactionsSnap.docs.map((d) => d.data());
      let txSupports = 0;
      let txProducts = 0;
      allTransactions.forEach((tx) => {
        if (tx.status === "successful" || tx.status === "success") {
          if (tx.type === "support") {
            txSupports += 1;
          } else if (tx.type === "product") {
            txProducts += 1;
          }
        }
      });

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

      // Pending verifications
      const verificationQuery = query(
        collection(db, "creators"),
        where("verified", "==", false),
        where("verificationStatus", "==", "pending"),
      );
      const verificationSnap = await getDocs(verificationQuery);

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
      });
      setTopEarners(earnersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTopViewed(viewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setWithdrawals(
        withdrawalSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
      setVerifications(
        verificationSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
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

    // Verification listener
    const verificationQuery = query(
      collection(db, "creators"),
      where("verified", "==", false),
      where("verificationStatus", "==", "pending"),
    );
    const unsubVerifications = onSnapshot(verificationQuery, (snap) => {
      setVerifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
              message: `Withdrawal of ${target.amount?.toLocaleString()} RWF for ${target.creatorName} was rejected`,
              read: false,
            };
            await addDoc(collection(db, "notifications"), notificationData);
          }
        }

        await logActivity({
          level: type === "approve" ? "success" : "warning",
          category: "payout",
          message: `Withdrawal ${type === "approve" ? "approved" : "rejected"}: ${target.amount?.toLocaleString()} RWF for ${target.creatorName}`,
          creatorId: target.creatorId,
          creatorHandle: target.creatorHandle,
        });

        toast.success(
          `Withdrawal ${type === "approve" ? "approved" : "rejected"}`,
        );
      } else {
        const isApprove = type === "approve";
        await updateDoc(doc(db, "creators", target.id), {
          verified: type === "approve",
          verificationStatus: isApprove ? "approved" : "rejected",
        });

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
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20 relative">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
              Platform Control
            </h1>
            <p className="text-slate-500 font-medium">
              Manage growth, verify creators, and process payouts.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            <Loader size={16} />
            Refresh
          </button>
        </header>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Platform Income"
            value={`${stats.totalPlatformIncome.toLocaleString()} RWF`}
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
            value={`${stats.totalPayoutsProcessed.toLocaleString()} RWF`}
            icon={<CheckCircle2 className="text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            label="Pending Payouts"
            value={`${stats.totalPendingPayouts.toLocaleString()} RWF`}
            icon={<Clock className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Profile Visits"
            value={stats.totalViews.toLocaleString()}
            icon={<Eye className="text-purple-600" />}
            color="bg-purple-50"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Profiles
              </p>
            </div>
            <p className="text-xl font-bold">{stats.profileCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={14} className="text-orange-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Creators
              </p>
            </div>
            <p className="text-xl font-bold">{stats.creatorCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={14} className="text-cyan-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Store Orders
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-pink-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Supports
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalSupports}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={14} className="text-amber-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Products
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalProducts}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-purple-600" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Giveaways
              </p>
            </div>
            <p className="text-xl font-bold">{stats.totalGiveaways}</p>
          </div>
        </div>

        {/* CHARTS SECTION - One per row, horizontally scrollable */}
        <div className="space-y-8 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">
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
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
                          className="w-3 sm:w-4 md:w-5 lg:w-6 bg-slate-300 rounded-t"
                          style={{ height: `${Math.max(prevHeight, 2)}%` }}
                          title={`Previous: ${userGrowthData.previous[index]}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-[40px]">
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
                <span className="text-slate-500">
                  {growthFilter === "7d" ? "This Week" : growthFilter === "weekly" ? "This Week" : growthFilter === "monthly" ? "This Year" : growthFilter === "annual" ? "Year" : "Year"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-300 rounded" />
                <span className="text-slate-500">
                  {growthFilter === "7d" ? "Last Week" : growthFilter === "weekly" ? "Last Week" : growthFilter === "monthly" ? "Last Year" : growthFilter === "annual" ? "Last Year" : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">
              Platform Income vs Payouts
            </h3>
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
                          title={`Income: ${data.income.toLocaleString()} RWF`}
                        />
                        <div
                          className="w-4 sm:w-5 md:w-6 lg:w-8 bg-orange-500 rounded-t"
                          style={{ height: `${Math.max(payoutHeight, 2)}%` }}
                          title={`Payouts: ${data.payouts.toLocaleString()} RWF`}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400">
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
                <span className="text-xs text-slate-500">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-xs text-slate-500">Payouts</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">
              Transaction Overview
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Supports</span>
                  <span className="font-bold">{stats.totalSupports}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
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
                <div className="w-full bg-slate-100 rounded-full h-3">
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

        {/* PENDING REQUESTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <section className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
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
                <div className="p-10 text-center text-slate-400 text-sm">
                  No pending withdrawals.
                </div>
              ) : (
                withdrawals.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    <div>
                      <p className="font-bold text-sm">
                        {req.creatorName || "Creator"}
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {req.amount?.toLocaleString()} RWF
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
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

          <section className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
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
                <div className="p-10 text-center text-slate-400 text-sm">
                  No pending verifications.
                </div>
              ) : (
                verifications.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                        <img
                          src={creator.profilePicture || ""}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{creator.name}</p>
                        <p className="text-xs text-slate-400">
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
                        className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all"
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
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
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
                  subText={`${(creator.totalEarnings || 0).toLocaleString()} RWF`}
                />
              ))}
              {topEarners.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  No data yet
                </p>
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
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
                <p className="text-slate-400 text-sm text-center py-4">
                  No data yet
                </p>
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
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
                    <p className="text-[10px] text-slate-400">
                      {activity.createdAt?.toDate?.()?.toLocaleTimeString() ||
                        "Now"}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl scale-in-center">
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
            <p className="text-slate-500 mb-8 font-medium">
              Are you sure you want to{" "}
              <span className="font-bold text-slate-900">{modal.type}</span>{" "}
              this {modal.category} request for{" "}
              <span className="font-bold text-slate-900">
                {modal.target.name || modal.target.creatorName || "this user"}
              </span>
              ? This action cannot be undone.
            </p>
            {modal.type === "reject" && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Rejection Reason (Sent to Creator)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. ID document is too blurry to read."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-red-500 outline-none transition-all h-28 resize-none"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={processing}
                className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest"
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
