/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader,
  Wallet,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { EmptyState } from "./payoutspage/index";
import { getCurrencySymbol } from "@/types/currency";

export default function PayoutsPage() {
  const router = useRouter();
  const { creator } = useAuth();
  const [view, setView] = useState("overview");
  const [historyTab, setHistoryTab] = useState("payouts");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorCurrency, setCreatorCurrency] = useState("RWF");
  const [withdrawThreshold, setWithdrawThreshold] = useState(10000);

  const [withdrawType, setWithdrawType] = useState<"all" | "custom">("all");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [perCurrencyBalances, setPerCurrencyBalances] = useState<Array<{ currency: string; pending: number; threshold: number }>>([]);

  const pendingAmount = creator?.pendingPayout || 0;
  const pendingAmountUSD = creator?.pendingPayoutUSD || 0;
  const isVerified = creator?.verified || false;
  const payoutPref = String(
    verificationRequest?.payoutPreference ?? "",
  ).toLowerCase();

  const prefLabel = payoutPref === "bank" ? "Bank Account" : "Mobile Money";
  const prefShort = payoutPref === "bank" ? "BANK" : "MOMO";

  useEffect(() => {
    if (!creator) return;

    const fetchCreatorData = async () => {
      try {
        const creatorRef = doc(db, "creators", creator.handle);
        const snap = await getDoc(creatorRef);
        if (snap.exists()) {
          const currency = snap.data().currency || "RWF";
          setCreatorCurrency(currency);
        }

        const currenciesSnap = await getDocs(collection(db, "currencies"));
        const currencies: any[] = currenciesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const [supportsSnap, snap2] = await Promise.all([
          getDocs(query(collection(db, "supportedCreators"), where("creatorId", "==", creator.handle))),
          snap.exists() ? snap : null,
        ]);
        const mainCurrency = snap2?.data()?.currency || "RWF";

        const hasUSD = supportsSnap.docs.some((d) => (d.data().currency || "RWF") === "USD");
        const totalPending = creator?.pendingPayout || 0;
        const totalPendingUSD = creator?.pendingPayoutUSD || 0;

        const rwfMatched = currencies.find((c: any) => c.code === mainCurrency);
        const usdMatched = currencies.find((c: any) => c.code === "USD");

        const balances: Array<{ currency: string; pending: number; threshold: number }> = [
          { currency: mainCurrency, pending: totalPending, threshold: rwfMatched?.payoutThreshold || 10000 },
        ];
        if (hasUSD) {
          balances.push({ currency: "USD", pending: totalPendingUSD, threshold: usdMatched?.payoutThreshold || 10000 });
        }
        if (rwfMatched) {
          setWithdrawThreshold(rwfMatched.payoutThreshold || 10000);
        }
        setPerCurrencyBalances(balances);
      } catch { /* silently fail */ }
    };
    fetchCreatorData();

    const qPayouts = query(
      collection(db, "payouts"),
      where("creatorUid", "==", creator.uid),
      orderBy("createdAt", "desc"),
    );

    const qRequests = query(
      collection(db, "withdrawRequests"),
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubPayouts = onSnapshot(qPayouts, (snap) => {
      setPayouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qVerification = query(
      collection(db, "verificationRequests"),
      where("uid", "==", creator.uid),
      orderBy("createdAt", "desc"),
      limit(1),
    );

    const unsubVerification = onSnapshot(qVerification, (snap) => {
      if (!snap.empty) {
        setVerificationRequest({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });

    return () => {
      unsubPayouts();
      unsubRequests();
      unsubVerification();
    };
  }, []);

  const handleWithdrawInit = () => {
    if (!isVerified) {
      toast.error("Please verify your identity first.");
      router.push("/creator/verify");
      return;
    }
    if (pendingAmount < withdrawThreshold) {
      toast.error(
         `Minimum withdraw is ${withdrawThreshold.toLocaleString()} ${getCurrencySymbol(creatorCurrency)}`,
      );
      return;
    }
    setView("withdraw");
  };

  const submitRequest = async () => {
    if (!creator) return;
    const finalAmount =
      withdrawType === "all" ? pendingAmount : parseInt(customAmount);

    if (isNaN(finalAmount) || finalAmount < withdrawThreshold) {
      toast.error(
         `Amount must be at least ${withdrawThreshold.toLocaleString()} ${getCurrencySymbol(creatorCurrency)}`,
      );
      return;
    }

    if (finalAmount > pendingAmount) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "withdrawRequests"), {
        creatorId: creator.uid,
        creatorName: creator.name,
        handle: creator.handle,
        amount: finalAmount,
        currency: creatorCurrency,
        status: "pending",
        method: creator.network || "MTN",
        accountNumber: creator.payoutNumber || "",
        createdAt: serverTimestamp(),
      });
      setWithdrawStep(2);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin text-orange-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <main className="flex-1 p-8 max-w-5xl mx-auto">
        {view === "overview" ? (
          <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight uppercase">
                  Payouts
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Simplicity and exclusive incentives.
                </p>
              </div>
              <button
                disabled={pendingAmount < withdrawThreshold}
                onClick={handleWithdrawInit}
                className={`px-8 py-4 rounded-lg font-black text-sm transition shadow-xl flex items-center gap-2 ${
                  pendingAmount >= withdrawThreshold
                    ? "bg-foreground text-background hover:bg-orange-600"
                    : "bg-border-strong text-muted-foreground cursor-not-allowed"
                }`}
              >
                Request to Withdraw <ArrowUpRight size={18} />
              </button>
            </header>

            {!isVerified && (
              <div className="mb-8 p-6 bg-foreground rounded-lg flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">
                      Identity Verification Required
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Unlock payouts and set your destination.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/creator/verify")}
                  className="bg-card text-foreground px-6 py-3 rounded-lg text-xs font-black uppercase"
                >
                  Verify Now
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-card p-8 rounded-lg border border-border shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Pending Balance
                </p>
                {perCurrencyBalances.map((b) => (
                  <h2 key={b.currency} className="text-2xl font-black">
                    {b.pending.toLocaleString()}{" "}
                    <span className="text-sm font-bold text-muted-foreground">
                      {getCurrencySymbol(b.currency)}
                    </span>
                  </h2>
                ))}
              </div>
              <div className="bg-card p-8 rounded-lg border border-border shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Total Earnings
                </p>
                <h2 className="text-4xl font-black">
                  {(creator?.totalEarnings || 0).toLocaleString()}{" "}
                  <span className="text-sm font-bold text-muted-foreground">
                    {getCurrencySymbol(creatorCurrency)}
                  </span>
                </h2>
              </div>
              <div className="bg-card p-8 rounded-lg border border-border shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Destination
                </p>
                {isVerified && verificationRequest ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-black text-xs">
                      {prefShort}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        {verificationRequest.bankName || prefLabel}
                      </span>
                      {verificationRequest.accountName && (
                        <span className="text-xs text-muted-foreground">
                          {verificationRequest.accountName}
                        </span>
                      )}
                      {verificationRequest.accountNumber && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {verificationRequest.accountNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span
                    className="text-sm font-bold text-muted-foreground underline cursor-pointer"
                    onClick={() => router.push("/creator/verify")}
                  >
                    Not Verified
                  </span>
                )}
              </div>
            </div>

            {/* Progress to Threshold - Per Currency */}
            <div className="bg-card p-8 rounded-lg border border-border shadow-sm mb-10 space-y-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Progress to Payout Threshold
              </p>
              {perCurrencyBalances.map((b) => {
                const progress = Math.min((b.pending / b.threshold) * 100, 100);
                return (
                  <div key={b.currency}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-foreground">
                        {b.currency} ({getCurrencySymbol(b.currency)})
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {b.pending.toLocaleString()} / {b.threshold.toLocaleString()} {getCurrencySymbol(b.currency)}
                      </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 mb-1">
                      <div
                        className="bg-orange-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.pending >= b.threshold
                        ? "You've reached the payout threshold! You can now request a withdrawal."
                        : `You need ${(b.threshold - b.pending).toLocaleString()} ${getCurrencySymbol(b.currency)} more to reach the payout threshold.`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* History Section */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="p-8 border-b border-border flex items-center justify-between bg-muted/50">
                <div className="flex gap-4">
                  <button
                    onClick={() => setHistoryTab("payouts")}
                    className={`text-sm font-black uppercase tracking-widest ${historyTab === "payouts" ? "text-foreground underline underline-offset-8" : "text-muted-foreground"}`}
                  >
                    Payouts
                  </button>
                  <button
                    onClick={() => setHistoryTab("requests")}
                    className={`text-sm font-bold uppercase tracking-widest ${historyTab === "requests" ? "text-foreground underline underline-offset-8" : "text-muted-foreground"}`}
                  >
                    Withdraw Requests
                  </button>
                </div>
              </div>

              <div className="divide-y divide-border">
                {historyTab === "payouts" ? (
                  payouts.length === 0 ? (
                    <EmptyState msg="No payout history found" />
                  ) : (
                    payouts.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-6 flex items-center justify-between hover:bg-muted transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              Transfer to MoMo
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                              {tx.createdAt?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black">
                            -{tx.amount.toLocaleString()} {getCurrencySymbol(creatorCurrency)}
                          </p>
                          <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                            Completed
                          </p>
                        </div>
                      </div>
                    ))
                  )
                ) : requests.length === 0 ? (
                  <EmptyState msg="No requests found" />
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-6 flex items-center justify-between hover:bg-muted transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${req.status === "pending" ? "bg-orange-50 text-orange-600" : "bg-muted text-muted-foreground"}`}
                        >
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            Withdrawal Request
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                            {req.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">
                          {req.amount.toLocaleString()} {getCurrencySymbol(creatorCurrency)}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-widest ${req.status === "pending" ? "text-orange-600" : req.status === "approved" ? "text-green-500" : "text-red-500"}`}
                        >
                          {req.status}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto py-10 animate-in slide-in-from-bottom-8 duration-500">
            <button
              onClick={() => {
                setView("overview");
                setWithdrawStep(1);
              }}
              className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground font-black text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Go Back
            </button>

            {withdrawStep === 1 && (
              <div className="space-y-8 bg-card p-10 rounded-lg shadow-2xl border border-border">
                <header>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">
                    Withdraw Funds
                  </h2>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                    Your request will be reviewed and responded to within{" "}
                    <b>48 hours</b>.
                  </p>
                </header>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setWithdrawType("all")}
                      className={`py-4 rounded-lg border-2 font-bold text-sm transition-all ${withdrawType === "all" ? "border-orange-600 bg-orange-50 text-orange-600" : "border-border text-muted-foreground"}`}
                    >
                      Withdraw All
                    </button>
                    <button
                      onClick={() => setWithdrawType("custom")}
                      className={`py-4 rounded-lg border-2 font-bold text-sm transition-all ${withdrawType === "custom" ? "border-orange-600 bg-orange-50 text-orange-600" : "border-border text-muted-foreground"}`}
                    >
                      Custom Amount
                    </button>
                  </div>

                  {withdrawType === "custom" && (
                    <div className="relative">
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder={`Enter amount (${creatorCurrency})`}
                        className="w-full bg-muted p-4 rounded-lg font-black text-lg outline-none border-2 border-transparent focus:border-orange-600 transition"
                      />
                    </div>
                  )}
                </div>

                <div className="py-6 border-y border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center mb-1">
                    Target Account
                  </p>
                  <p className="text-center font-black text-foreground">
                    {creator?.payoutNumber} ({creator?.network})
                  </p>
                </div>

                <button
                  onClick={submitRequest}
                  disabled={isSubmitting}
                  className="w-full bg-foreground text-background py-6 rounded-lg font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader className="animate-spin" />
                  ) : (
                    "Request to Withdraw"
                  )}
                </button>
              </div>
            )}

            {withdrawStep === 2 && (
              <div className="text-center space-y-8 bg-foreground p-12 rounded-lg shadow-2xl text-background">
                <div className="w-24 h-24 bg-green-500 rounded-lg flex items-center justify-center mx-auto rotate-12">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">
                    Request Sent!
                  </h2>
                  <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                    We have received your request. Our team will verify the data
                    and process your funds shortly.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setView("overview");
                    setWithdrawStep(1);
                  }}
                  className="w-full bg-card text-foreground py-5 rounded-lg font-black uppercase text-sm hover:bg-orange-500 hover:text-white transition"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
