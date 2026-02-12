"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  count,
} from "firebase/firestore";
import {
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  UserCheck,
  BarChart3,
} from "lucide-react";
import Loading from "@/app/loading";
import Navbar from "@/components/parts/Navigation";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlatformIncome: 0,
    profileCount: 0,
    creatorCount: 0,
  });
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [topViewed, setTopViewed] = useState<any[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const incomeSnap = await getDocs(collection(db, "platformIncome"));
        let totalIncome = 0;
        incomeSnap.forEach((doc) => {
          totalIncome += doc.data().amount || 0;
        });

        // 2. Get Counts
        const profilesSnap = await getDocs(collection(db, "profiles"));
        const creatorsSnap = await getDocs(collection(db, "creators"));

        // 3. Top Earners (Creators)
        const earnersQuery = query(
          collection(db, "creators"),
          orderBy("totalEarnings", "desc"),
          limit(5),
        );
        const earnersSnap = await getDocs(earnersQuery);
        const earners = earnersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 4. Most Viewed (Creators)
        const viewsQuery = query(
          collection(db, "creators"),
          orderBy("views", "desc"),
          limit(5),
        );
        const viewsSnap = await getDocs(viewsQuery);
        const views = viewsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStats({
          totalPlatformIncome: totalIncome,
          profileCount: profilesSnap.size,
          creatorCount: creatorsSnap.size,
        });
        setTopEarners(earners);
        setTopViewed(views);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Platform Analytics
          </h1>
          <p className="text-slate-500 font-medium">
            Overview of Agaseke's growth and revenue.
          </p>
        </header>

        {/* STATS GRID */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* TOP EARNERS TABLE */}
          <section className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-xl font-bold">Top Earners</h2>
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

          {/* TOP VIEWED TABLE */}
          <section className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-600 rounded-lg text-white">
                <Eye size={20} />
              </div>
              <h2 className="text-xl font-bold">Most Profile Views</h2>
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
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function RankRow({ rank, name, subText }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-slate-300 w-6">#{rank}</span>
        <div>
          <p className="font-bold text-slate-900">{name}</p>
        </div>
      </div>
      <p className="font-bold text-orange-600 text-sm">{subText}</p>
    </div>
  );
}
