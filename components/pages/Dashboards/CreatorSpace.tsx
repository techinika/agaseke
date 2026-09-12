/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  Lock,
  Crown,
  Gift,
  CalendarCheck,
  ShoppingBag,
  Ticket,
  ChevronRight,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  StatTile,
  ActivityRow,
  HistoryItem,
} from "./creatorspace/index";
import { getCurrencySymbol } from "@/types/currency";

export default function CreatorDashboard() {
  const { creator } = useAuth();
  const router = useRouter();
  const [creatorCurrency, setCreatorCurrency] = useState("RWF");
  const [perCurrencyPayouts, setPerCurrencyPayouts] = useState<Array<{ currency: string; pending: number }>>([]);
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
        const cid = creatorDoc?.id;
        const creatorData = creatorDoc?.data();
        const mainCurrency = creatorData?.currency || "RWF";
        if (creatorDoc) {
          setCreatorCurrency(mainCurrency);
        }

        const supportSnap = await getDocs(query(
          collection(db, "supportedCreators"),
          where("creatorId", "==", cid),
          orderBy("createdAt", "desc"),
          limit(10),
        ));
        const supports = supportSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const currenciesSnap = await getDocs(collection(db, "currencies"));
        const currencyCodes = currenciesSnap.docs.map((d) => d.data().code);
        const hasUSD = currencyCodes.includes("USD");

        const getPending = (code: string) => code === "RWF" ? (creator?.pendingPayout || 0) : (creator as any)?.[`pendingPayout${code}`] || 0;

        const displayedCodes = [mainCurrency];
        if (hasUSD && mainCurrency !== "USD") displayedCodes.push("USD");
        if (mainCurrency === "USD" && currencyCodes.includes("RWF")) displayedCodes.push("RWF");

        const balances = displayedCodes.map((code) => ({
          currency: code,
          pending: getPending(code),
        }));
        setPerCurrencyPayouts(balances);

        const contentQ = query(
          collection(db, "creatorContent"),
          where("creatorId", "==", creator?.handle),
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
  }, [creator?.handle]);

  if (loading)
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-orange-600" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
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
        <div className="bg-foreground text-background p-8 rounded-lg shadow-xl shadow-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Available Balance
            </p>
            <Wallet size={18} className="text-orange-500" />
          </div>
          <div className="space-y-1">
            {perCurrencyPayouts.map((b) => (
              <h3 key={b.currency} className="text-2xl font-bold">
                {b.pending.toLocaleString()}
                <span className="text-sm font-medium text-muted-foreground ml-2">{getCurrencySymbol(b.currency)}</span>
              </h3>
            ))}
          </div>
          <button
            onClick={() => router.push("/creator/payouts")}
            className="mt-6 w-full py-3 bg-card/10 hover:bg-card/20 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
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

      {/* Ways to Earn & Build Trust */}
      <div className="mb-10">
        <h4 className="text-lg font-bold tracking-tight mb-4">
          Ways to earn &amp; build trust
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              href: "/creator/content",
              icon: <Lock size={20} />,
              title: "Exclusive Content",
              description:
                "Publish posts and articles only your supporters can see, giving them value beyond everyone else.",
            },
            {
              href: "/creator/community",
              icon: <Crown size={20} />,
              title: "Membership Tiers",
              description:
                "Create subscription tiers so loyal followers can support you regularly and unlock rewards.",
            },
            {
              href: "/creator/giveaways",
              icon: <Gift size={20} />,
              title: "Giveaways",
              description:
                "Organize giveaways and reward your supporters to grow loyalty and expand your reach.",
            },
            {
              href: "/creator/bookings",
              icon: <Ticket size={20} />,
              title: "Paid Bookings",
              description:
                "Offer paid one-on-one meetings and let supporters book time with you.",
            },
            {
              href: "/creator/gatherings",
              icon: <CalendarCheck size={20} />,
              title: "Gatherings & Events",
              description:
                "Host ticketed events, manage RSVPs, and check in attendees in one place.",
            },
            {
              href: "/creator/store",
              icon: <ShoppingBag size={20} />,
              title: "Merch Store",
              description:
                "Sell digital products and merchandise directly to your audience.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-card rounded-lg border border-border p-6 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  {card.icon}
                </div>
                <ChevronRight
                  size={18}
                  className="text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                />
              </div>
              <p className="font-bold text-sm text-foreground mb-1.5">
                {card.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Support Activity */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Recent Support
          </h4>

          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
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
                  currency={sup.currency || "RWF"}
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="text-muted-foreground" size={24} />
                </div>
                <p className="text-sm font-bold text-muted-foreground">
                  No support yet. Share your profile!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content History */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold tracking-tight">Your Activity</h4>
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
            {data.history.length > 0 ? (
              data.history.map((item: any) => (
                <HistoryItem key={item.id} {...item} />
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
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


