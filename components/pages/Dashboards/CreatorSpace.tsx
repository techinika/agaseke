/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  Loader,
  Calendar,
  FileText,
  Heart,
  Coffee,
} from "lucide-react";
import { db } from "@/db/firebase";
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
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default function CreatorDashboard() {
  const { creator } = useAuth();
  const router = useRouter();
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
          query(collection(db, "creators"), where("uid", "==", creator?.uid)),
        );
        const creatorDoc = creatorSnap.docs[0];
        const creatorData = creatorDoc?.data();
        const cid = creatorDoc?.id;

        const supportQ = query(
          collection(db, "supportedCreators"),
          where("creatorId", "==", cid),
          orderBy("createdAt", "desc"),
          limit(10),
        );
        const supportSnap = await getDocs(supportQ);
        const supports = supportSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const contentQ = query(
          collection(db, "creatorContent"),
          where("creatorId", "==", creator?.uid),
          orderBy("createdAt", "desc"),
          limit(5),
        );
        const gatheringQ = query(
          collection(db, "creatorGatherings"),
          where("creatorId", "==", creator?.uid),
          orderBy("createdAt", "desc"),
          limit(5),
        );

        const [contentSnap, gatheringSnap] = await Promise.all([
          getDocs(contentQ),
          getDocs(gatheringQ),
        ]);

        const contentItems = contentSnap.docs.map((doc) => ({
          id: doc.id,
          type: "Content",
          title: doc.data().title,
          createdAt: doc.data().createdAt?.toDate(),
          meta: `${doc.data().views || 0} views`,
          icon: <FileText size={12} />,
        }));

        const gatheringItems = gatheringSnap.docs.map((doc) => ({
          id: doc.id,
          type: "Gathering",
          title: doc.data().title,
          createdAt: doc.data().createdAt?.toDate(),
          meta: `${doc.data().location || "Online"}`,
          icon: <Calendar size={12} />,
        }));

        const combinedHistory = [...contentItems, ...gatheringItems].sort(
          (a: any, b: any) => b.createdAt - a.createdAt,
        );

        setData({
          recentSupport: supports,
          history: combinedHistory,
        });
      } catch (e) {
        console.error("Dashboard Load Error:", e);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [creator]);

  if (loading)
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-orange-600" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading Agaseke...
        </p>
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      {/* Verification Alert */}
      {!creator?.verified && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-bold">
              Verification required to withdraw funds.
            </span>
          </div>
          <button
            onClick={() => router.push("/creator/verify")}
            className="text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition"
          >
            VERIFY NOW
          </button>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 text-white p-8 rounded-lg shadow-xl shadow-slate-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Available Balance
            </p>
            <Wallet size={18} className="text-orange-500" />
          </div>
          <h3 className="text-4xl font-bold">
            {creator?.pendingPayout?.toLocaleString() || 0}
            <span className="text-sm font-medium text-slate-500 ml-2">RWF</span>
          </h3>
          <button
            onClick={() => router.push("/creator/payouts")}
            className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
          >
            WITHDRAW FUNDS <ExternalLink size={12} />
          </button>
        </div>

        <StatTile
          title="Total Views"
          value={creator?.views?.toLocaleString() || "0"}
          icon={<TrendingUp size={16} />}
        />
        <StatTile
          title="Community"
          value={creator?.totalSupporters?.toLocaleString() || "0"}
          icon={<Heart size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Support Activity */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Recent Support
          </h4>

          <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm">
            {data.recentSupport.length > 0 ? (
              data.recentSupport.map((sup: any) => (
                <ActivityRow
                  key={sup.id}
                  name={
                    sup.supporterId === "anonymous"
                      ? "Someone"
                      : sup.supporterName || "A Supporter"
                  }
                  amount={sup.amount?.toLocaleString()}
                  time={
                    sup.createdAt
                      ? formatDistanceToNow(sup.createdAt.toDate(), {
                          addSuffix: true,
                        })
                      : "just now"
                  }
                />
              ))
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="text-slate-300" size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  No support yet. Share your profile!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content History */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold tracking-tight">Your Activity</h4>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm space-y-6">
            {data.history.length > 0 ? (
              data.history.map((item: any) => (
                <HistoryItem key={item.id} {...item} />
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  No activity found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ title, value, icon }: any) {
  return (
    <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-4xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function ActivityRow({ name, amount, time }: any) {
  return (
    <div className="p-6 flex items-center gap-4 hover:bg-slate-50 transition border-b border-slate-50 last:border-0">
      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-lg font-bold shrink-0">
        {name[0]}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">
            {name}{" "}
            <span className="font-normal text-slate-400 ml-1">gifted you</span>
          </p>
          <span className="text-[10px] font-bold text-slate-300 uppercase">
            {time}
          </span>
        </div>
        <p className="text-lg font-bold text-orange-600 tracking-tight">
          {amount} RWF
        </p>
      </div>
    </div>
  );
}

function HistoryItem({ type, title, meta, icon }: any) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="mt-1 w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-600 transition">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1 group-hover:text-orange-600 transition">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
            {type}
          </span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span className="text-[10px] font-medium text-slate-400">{meta}</span>
        </div>
      </div>
    </div>
  );
}
