"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Wallet,
  CheckCircle,
  Clock,
  Search,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPayouts() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // We only want creators who have money waiting to be paid out
    const q = query(collection(db, "creators"), where("pendingPayout", ">", 0));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const creatorList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCreators(creatorList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalPending = creators.reduce(
    (acc, curr) => acc + (curr.pendingPayout || 0),
    0,
  );

  const handleApprovePayout = async (creator: any) => {
    const amount = creator.pendingPayout;
    if (
      !confirm(
        `Are you sure you want to approve a payout of ${amount} RWF for ${creator.name}?`,
      )
    )
      return;

    setProcessingId(creator.id);

    try {
      await runTransaction(db, async (transaction) => {
        const creatorRef = doc(db, "creators", creator.id);
        const payoutRef = doc(collection(db, "payouts")); // Create a log

        // 1. Reset pendingPayout to 0
        transaction.update(creatorRef, {
          pendingPayout: 0,
          lastPayoutAt: serverTimestamp(),
        });

        // 2. Create a payout record for history
        transaction.set(payoutRef, {
          creatorId: creator.id,
          creatorUid: creator.uid,
          amount: amount,
          status: "completed",
          approvedAt: serverTimestamp(),
          method: "MoMo",
        });
      });

      toast.success(`Payout of ${amount} RWF for ${creator.name} recorded!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process payout.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredCreators = creators.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Payout Management
            </h1>
            <p className="text-slate-500 font-medium">
              Review and approve creator earnings.
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Total Liability
              </p>
              <p className="text-2xl font-black text-slate-900">
                {totalPending.toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">RWF</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search creator name or handle..."
              className="w-full bg-white border border-slate-200 py-3 pl-12 pr-4 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Main Table Area */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-medium">Loading payout data...</p>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="bg-slate-50 w-16 h-16 rounded-lg flex items-center justify-center mx-auto text-slate-300">
                <CheckCircle size={32} />
              </div>
              <p className="text-slate-500 font-medium">
                No pending payouts at the moment.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Creator
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
                    Pending Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCreators.map((creator) => (
                  <tr
                    key={creator.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                          {creator.profilePicture ? (
                            <img
                              src={creator.profilePicture}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                              {creator.name?.[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {creator.name}
                          </p>
                          <p className="text-xs text-slate-400 font-medium tracking-tight">
                            @{creator.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider w-fit">
                        <Clock size={12} /> Pending
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-900">
                      {creator.pendingPayout.toLocaleString()}{" "}
                      <span className="text-[10px] font-medium text-slate-400">
                        RWF
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleApprovePayout(creator)}
                        disabled={processingId === creator.id}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ml-auto"
                      >
                        {processingId === creator.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            Approve Payout <ArrowUpRight size={14} />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-3 p-4 bg-slate-100/50 border border-slate-200 rounded-lg text-slate-500">
          <AlertCircle size={18} />
          <p className="text-xs font-medium italic">
            Note: Approving a payout resets the creator's balance in Agaseke.
            Ensure you have manually sent the MoMo transfer before confirming.
          </p>
        </div>
      </div>
    </div>
  );
}
