"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  ArrowLeft,
  Loader2,
  Filter,
  Download,
} from "lucide-react";

export default function PayoutsPage() {
  const [view, setView] = useState("overview"); // overview | withdraw
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1: Amount, 2: OTP, 3: Success
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  
  // Simulated Data
  const balance = 45200;
  const isVerified = false; // Toggle this to see different states
  const momoNumber = "078****231";

  const transactions = [
    { id: "TX-901", date: "Jan 28, 2026", type: "Support", status: "Completed", amount: "+5,000", from: "Marie-Rose U." },
    { id: "TX-900", date: "Jan 25, 2026", type: "Withdrawal", status: "Completed", amount: "-20,000", from: "MoMo Wallet" },
    { id: "TX-899", date: "Jan 24, 2026", type: "Support", status: "Completed", amount: "+2,000", from: "Innocent K." },
  ];

  const handleWithdrawClick = () => {
    if (!isVerified) {
      alert("Please verify your identity first.");
      return;
    }
    setView("withdraw");
  };

  const simulateWithdraw = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawStep(2);
    }, 1500);
  };

  const finalConfirm = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawStep(3);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans text-slate-900">
      {/* Sidebar Placeholder (Matching previous dashboard style) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
         <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition">
            <ArrowLeft size={16} /> <span className="text-xs font-bold">Back to Dashboard</span>
         </button>
      </aside>

      <main className="flex-1 p-8 max-w-5xl mx-auto">
        {view === "overview" ? (
          <div className="animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight">Payouts</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your earnings and transfer funds to MoMo.</p>
              </div>
              <div className="flex gap-3">
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500">
                  <Download size={18} />
                </button>
                <button 
                  onClick={handleWithdrawClick}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-sm flex items-center gap-2 ${
                    isVerified ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Withdraw Funds <ArrowUpRight size={16} />
                </button>
              </div>
            </header>

            {/* Verification Alert */}
            {!isVerified && (
              <div className="mb-8 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Payouts are currently locked</h4>
                    <p className="text-xs text-amber-700">You need to verify your ID and phone number before your first withdrawal.</p>
                  </div>
                </div>
                <button className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700 transition">Verify Now</button>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Total Balance</p>
                <h2 className="text-4xl font-black">{balance.toLocaleString()} <span className="text-sm font-normal text-slate-400">RWF</span></h2>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pending</p>
                <h2 className="text-4xl font-black text-slate-300">0 <span className="text-sm font-normal text-slate-400">RWF</span></h2>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Payout Method</p>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-black text-[10px]">MTN</div>
                   <span className="text-sm font-bold text-slate-700">{momoNumber}</span>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Transaction History</h3>
                  <button className="text-xs font-bold text-slate-400 flex items-center gap-1"><Filter size={14}/> Filter</button>
               </div>
               <div className="divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'Withdrawal' ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-600'}`}>
                           {tx.type === 'Withdrawal' ? <ArrowUpRight size={18}/> : <CheckCircle2 size={18}/>}
                        </div>
                        <div>
                          <p className="text-sm font-bold group-hover:text-orange-600 transition">{tx.from}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{tx.type} • {tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${tx.amount.startsWith('-') ? 'text-slate-900' : 'text-green-600'}`}>{tx.amount} RWF</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tx.status}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ) : (
          /* --- Withdrawal Flow --- */
          <div className="max-w-md mx-auto py-10 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setView("overview")} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm transition">
               <ArrowLeft size={16} /> Cancel
            </button>

            {withdrawStep === 1 && (
              <div className="space-y-6">
                <header>
                  <h2 className="text-3xl font-black">How much?</h2>
                  <p className="text-slate-500 text-sm">Funds will be sent to <b>{momoNumber}</b> instantly.</p>
                </header>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-transparent border-b-4 border-slate-100 py-6 text-5xl font-black focus:border-orange-600 outline-none transition-all placeholder:text-slate-100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute right-0 bottom-6 font-black text-slate-300">RWF</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
                  <span>Balance: {balance.toLocaleString()} RWF</span>
                  <button onClick={() => setAmount(balance.toString())} className="text-orange-600">Withdraw All</button>
                </div>
                <button 
                  onClick={simulateWithdraw}
                  disabled={!amount || parseInt(amount) < 500 || isWithdrawing}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition active:scale-95"
                >
                  {isWithdrawing ? <Loader2 className="animate-spin" /> : "Initiate Withdrawal"}
                </button>
              </div>
            )}

            {withdrawStep === 2 && (
              <div className="space-y-6 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={32} />
                </div>
                <header className="text-center">
                  <h2 className="text-2xl font-black">Verify it's you</h2>
                  <p className="text-slate-500 text-sm mt-1">We sent a 6-digit code to your phone.</p>
                </header>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-center text-3xl font-black tracking-[0.5em] focus:border-orange-500 outline-none"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if(e.target.value.length === 6) finalConfirm();
                  }}
                />
                <button className="w-full text-xs font-bold text-slate-400 hover:text-orange-600 transition">Resend Code (45s)</button>
              </div>
            )}

            {withdrawStep === 3 && (
              <div className="text-center space-y-6 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                   <CheckCircle2 size={48} />
                </div>
                <header>
                  <h2 className="text-3xl font-black">Money on its way!</h2>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    We've processed your withdrawal of <b>{parseInt(amount).toLocaleString()} RWF</b>. 
                    You should receive it on your phone in less than a minute.
                  </p>
                </header>
                <div className="pt-8">
                  <button 
                    onClick={() => {setView("overview"); setWithdrawStep(1); setAmount(""); setOtp("");}}
                    className="w-full bg-slate-100 text-slate-900 py-4 rounded-xl font-bold hover:bg-slate-200 transition"
                  >
                    Back to Payouts
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}