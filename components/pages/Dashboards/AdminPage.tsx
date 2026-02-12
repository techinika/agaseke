"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
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
  Clock,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import Loading from "@/app/loading";
import Navbar from "@/components/parts/Navigation";
import { StatCard } from "@/components/parts/dashboard/StatCard";
import { RankRow } from "@/components/parts/dashboard/RankRow";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalPlatformIncome: 0,
    profileCount: 0,
    creatorCount: 0,
  });

  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [topViewed, setTopViewed] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);

  // Modal State
  const [modal, setModal] = useState<{
    show: boolean;
    type: "approve" | "reject";
    target: any;
    category: "withdrawal" | "verification";
  } | null>(null);

  const fetchData = async () => {
    try {
      // 1. Analytics & Stats
      const incomeSnap = await getDocs(collection(db, "platformIncome"));
      let totalIncome = 0;
      incomeSnap.forEach((doc) => {
        totalIncome += doc.data().amount || 0;
      });

      const profilesSnap = await getDocs(collection(db, "profiles"));
      const creatorsSnap = await getDocs(collection(db, "creators"));

      const earnersQuery = query(
        collection(db, "creators"),
        orderBy("totalEarnings", "desc"),
        limit(5),
      );
      const earnersSnap = await getDocs(earnersQuery);

      const viewsQuery = query(
        collection(db, "creators"),
        orderBy("views", "desc"),
        limit(5),
      );
      const viewsSnap = await getDocs(viewsQuery);

      // 2. Pending Requests
      const withdrawalQuery = query(
        collection(db, "withdrawRequests"),
        where("status", "==", "pending"),
      );
      const withdrawalSnap = await getDocs(withdrawalQuery);

      const verificationQuery = query(
        collection(db, "creators"),
        where("verified", "==", false),
        where("verificationStatus", "==", "pending"),
      );
      const verificationSnap = await getDocs(verificationQuery);

      setStats({
        totalPlatformIncome: totalIncome,
        profileCount: profilesSnap.size,
        creatorCount: creatorsSnap.size,
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async () => {
    if (!modal) return;
    setProcessing(true);
    const { target, type, category } = modal;

    try {
      if (category === "withdrawal") {
        await updateDoc(doc(db, "withdrawals", target.id), {
          status: type === "approve" ? "completed" : "rejected",
          updatedAt: new Date(),
        });
      } else {
        await updateDoc(doc(db, "creators", target.id), {
          verified: type === "approve",
          verificationSubmitted: false,
        });
      }
      setModal(null);
      await fetchData();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20 relative">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
            Platform Control
          </h1>
          <p className="text-slate-500 font-medium">
            Manage growth, verify creators, and process payouts.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            label="Platform Income"
            value={`${stats.totalPlatformIncome.toLocaleString()} RWF`}
            icon={<DollarSign className="text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatCard
            label="Total Profiles"
            value={stats.profileCount}
            icon={<Users className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Total Creators"
            value={stats.creatorCount}
            icon={<UserCheck className="text-orange-600" />}
            color="bg-orange-50"
          />
          <StatCard
            label="Growth Rate"
            value="Stable"
            icon={<TrendingUp className="text-purple-600" />}
            color="bg-purple-50"
          />
        </div>

        {/* PENDING REQUESTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
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
            <div className="p-2">
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
                        {req.amount.toLocaleString()} RWF
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
            <div className="p-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            </div>
          </section>
        </div>
      </main>

      {/* CONFIRMATION MODAL */}
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
