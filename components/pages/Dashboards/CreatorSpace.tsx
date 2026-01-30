/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  Loader,
} from "lucide-react";
import { auth, db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

export default function CreatorDashboard() {
  const { creator } = useAuth();
  const [data, setData] = useState<any>({
    recentSupport: [],
    history: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!creator) return;

      try {
        const creatorSnap = await getDocs(
          query(collection(db, "creators"), where("uid", "==", creator?.id)),
        );
        const creatorData = creatorSnap.docs[0]?.data();

        const supportQ = query(
          collection(db, "supportedCreators"),
          where("creatorId", "==", creatorData?.id),
          orderBy("lastSupport", "desc"),
          limit(5),
        );
        const supportSnap = await getDocs(supportQ);
        const supports = supportSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const contentQ = query(
          collection(db, "creatorContent"),
          where("creatorId", "==", creatorData?.id),
          orderBy("createdAt", "desc"),
          limit(3),
        );
        const contentSnap = await getDocs(contentQ);
        const history = contentSnap.docs.map((doc) => ({
          id: doc.id,
          type: "Post",
          title: doc.data().title,
          meta: `${doc.data().views || 0} views`,
        }));

        setData({
          recentSupport: supports,
          history: history,
        });
      } catch (e) {
        console.error("Dashboard Load Error:", e);
        toast.error("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="p-20 flex justify-center">
        <Loader className="animate-spin text-orange-600" />
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {!creator?.verified && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">
              Verification required to withdraw funds.
            </span>
          </div>
          <button className="text-xs font-bold bg-amber-200/50 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg transition">
            Verify Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Available
            </p>
            <Wallet size={16} className="text-slate-400" />
          </div>
          <h3 className="text-3xl font-black">
            {creator?.totalEarnings.toLocaleString()}{" "}
            <span className="text-sm font-normal text-slate-400">RWF</span>
          </h3>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <button className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
              Withdraw <ExternalLink size={12} />
            </button>
          </div>
        </div>

        <StatTile
          title="Profile Views"
          value={creator?.views?.toLocaleString() || "0"}
          change="+0%"
        />
        <StatTile
          title="Supporters"
          value={creator?.totalSupporters?.toLocaleString() || "0"}
          change="+0"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-500" /> Recent
              Support
            </h4>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {data.recentSupport.length > 0 ? (
              data.recentSupport.map((sup: any) => (
                <ActivityRow
                  key={sup.id}
                  name={sup.supporterName || "Supporter"}
                  amount={sup.totalAmountInvolved?.toLocaleString()}
                  time="Recent"
                  msg={sup.message}
                />
              ))
            ) : (
              <p className="p-8 text-center text-xs text-slate-400">
                No support received yet.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-bold">Past Activity</h4>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            {data.history.map((item: any) => (
              <HistoryItem key={item.id} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">
          {change}
        </span>
      </div>
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
    </div>
  );
}

function ActivityRow({
  name,
  amount,
  time,
  msg,
}: {
  name: string;
  amount: string;
  time: string;
  msg?: string;
}) {
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
        {name[0]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            {name}{" "}
            <span className="font-normal text-slate-400 text-xs tracking-tight">
              supported you
            </span>
          </p>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <p className="text-xs font-bold text-orange-600 mt-0.5">{amount} RWF</p>
        {msg && (
          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-md border border-slate-100">
            &quot;{msg}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

function HistoryItem({
  type,
  title,
  meta,
}: {
  type: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-orange-500 transition shadow-sm"></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-orange-600 transition">
          {title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
            {type}
          </span>
          <span className="text-[10px] text-slate-400">{meta}</span>
        </div>
      </div>
    </div>
  );
}
