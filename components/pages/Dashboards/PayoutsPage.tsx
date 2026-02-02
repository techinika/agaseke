/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ArrowLeft,
  Loader,
  History,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";

export default function PayoutsPage() {
  const router = useRouter();
  const { creator } = useAuth();
  const [view, setView] = useState("overview");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creator) return;

    const q = query(
      collection(db, "payouts"),
      where("creatorId", "==", creator?.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubPayouts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPayouts(docs);
      setLoading(false);
    });

    return () => {
      unsubPayouts();
    };
  }, [creator]);

  const totalPaidOut = creator?.totalEarnings || 0;
  const pendingAmount = creator?.pendingPayout || 0;
  const momoNumber = creator?.payoutNumber || "Not linked";
  const isVerified = creator?.verified || false;

  const handleWithdrawClick = () => {
    if (!isVerified) {
      router.push("/creator/settings");
      return;
    }
    setView("withdraw");
  };

  const simulateWithdraw = async () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawStep(2);
    }, 1500);
  };

  const finalConfirm = async () => {
    if (!creator) return;
    setIsWithdrawing(true);

    try {
      await addDoc(collection(db, "payouts"), {
        creatorId: creator.uid,
        amount: pendingAmount,
        recipient: momoNumber,
        network: creator.network,
        status: "Completed",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "creators", creator.uid), {
        pendingPayout: 0,
        totalEarnings: totalPaidOut + pendingAmount,
        lastPayoutAt: serverTimestamp(),
      });

      setWithdrawStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader className="animate-spin text-orange-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      <main className="flex-1 p-8 max-w-5xl mx-auto">
        {view === "overview" ? (
          <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight uppercase">
                  Payouts
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Access your earnings and track transfer history.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleWithdrawClick}
                  className={`px-8 py-4 rounded-lg font-black text-sm transition shadow-xl flex items-center gap-2 ${
                    isVerified
                      ? "bg-slate-900 text-white hover:bg-orange-600"
                      : "bg-slate-200 text-slate-400 cursor-pointer"
                  }`}
                >
                  Withdraw {totalPaidOut.toLocaleString()} RWF{" "}
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </header>

            {!isVerified && (
              <div className="mb-8 p-6 bg-slate-900 rounded-lg flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-12 h-12 bg-orange-500 text-white rounded-lg flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">Payouts are locked</h4>
                    <p className="text-xs text-slate-400">
                      Identity verification is required for security.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/creator/settings")}
                  className="bg-white text-slate-900 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition"
                >
                  Verify Now
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Total Balance
                </p>
                <h2 className="text-4xl font-black">
                  {totalPaidOut.toLocaleString()}{" "}
                  <span className="text-sm font-bold text-slate-300">RWF</span>
                </h2>
              </div>
              <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Next Pending
                </p>
                <h2 className="text-4xl font-black text-slate-200">
                  {pendingAmount.toLocaleString()}{" "}
                  <span className="text-sm font-bold text-slate-200">RWF</span>
                </h2>
              </div>
              <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Destination
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-black text-xs">
                    {creator?.network || "MTN"}
                  </div>
                  <span className="text-sm font-black text-slate-700">
                    {momoNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tighter">
                  Transaction History
                </h3>
                <History className="text-slate-200" size={20} />
              </div>

              {payouts.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">
                    No payout history found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {payouts.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-6 flex items-center justify-between hover:bg-slate-50 transition cursor-default"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black">Transfer to MoMo</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                            {tx.recipient} •{" "}
                            {tx.createdAt?.toDate().toLocaleDateString() ||
                              "Recently"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">
                          -{tx.amount.toLocaleString()} RWF
                        </p>
                        <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto py-10 animate-in slide-in-from-bottom-8 duration-500">
            <button
              onClick={() => setView("overview")}
              className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition"
            >
              <ArrowLeft size={16} /> Go Back
            </button>

            {withdrawStep === 1 && (
              <div className="space-y-8 bg-white p-10 rounded-lg shadow-2xl border border-slate-100">
                <header>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    Confirm Payout
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    You are about to withdraw your full balance to{" "}
                    <b>{momoNumber}</b>.
                  </p>
                </header>

                <div className="py-8 border-y border-slate-50">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 text-center">
                    Transfer Amount
                  </p>
                  <h3 className="text-5xl font-black text-center text-slate-900">
                    {totalPaidOut.toLocaleString()}{" "}
                    <span className="text-lg text-slate-300">RWF</span>
                  </h3>
                </div>

                <button
                  onClick={simulateWithdraw}
                  disabled={totalPaidOut <= 0 || isWithdrawing}
                  className="w-full bg-slate-900 text-white py-6 rounded-lg font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-orange-600 transition active:scale-95 disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <Loader className="animate-spin" />
                  ) : (
                    "Confirm Transfer"
                  )}
                </button>
              </div>
            )}

            {withdrawStep === 2 && (
              <div className="space-y-6 animate-in zoom-in-95 bg-white p-10 rounded-lg shadow-2xl">
                <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={40} />
                </div>
                <header className="text-center">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">
                    Security Check
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Enter the OTP sent to your verified number.
                  </p>
                </header>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-lg text-center text-4xl font-black tracking-[0.5em] focus:border-orange-500 outline-none"
                  onChange={(e) => {
                    if (e.target.value.length === 6) finalConfirm();
                  }}
                />
                <p className="text-center text-[10px] font-black text-slate-300 uppercase">
                  Wait 58s to resend
                </p>
              </div>
            )}

            {withdrawStep === 3 && (
              <div className="text-center space-y-8 animate-in zoom-in-95 bg-slate-900 p-12 rounded-lg shadow-2xl text-white">
                <div className="w-28 h-28 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                  <CheckCircle2 size={56} />
                </div>
                <header>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    Paid Out!
                  </h2>
                  <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                    We&apos;ve processed your payout of{" "}
                    <b>{totalPaidOut.toLocaleString()} RWF</b>. Expect an SMS
                    from {creator?.network || "MTN"} momentarily.
                  </p>
                </header>
                <button
                  onClick={() => {
                    setView("overview");
                    setWithdrawStep(1);
                  }}
                  className="w-full bg-white text-slate-900 py-5 rounded-lg font-black uppercase tracking-widest text-sm hover:bg-orange-500 hover:text-white transition"
                >
                  Return to Payouts
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
