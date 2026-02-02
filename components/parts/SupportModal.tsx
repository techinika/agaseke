"use client";

import { useAuth } from "@/auth/AuthContext";
import { db } from "@/db/firebase";
import { query, where, getDocs, collection } from "firebase/firestore";
import { ShieldCheck, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SupportModal({
  isOpen,
  onClose,
  creatorName,
  creatorId,
  uid,
}: any) {
  const { user: currentUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("input"); // input, processing, success, error
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSupport = async () => {
    setStep("processing");
    setErrorMessage("");

    try {
      const response = await fetch("/api/support/with-momo/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          phone: phone,
          creatorId: creatorId, // handle
          creatorUid: uid, // firebase uid
          supporterId: currentUser?.uid || "anonymous",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ref) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      const checkStatus = setInterval(async () => {
        const q = query(
          collection(db, "transactions"),
          where("ref", "==", data.ref),
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const txData = querySnapshot.docs[0].data();

          if (txData.status === "successful") {
            clearInterval(checkStatus);
            setStep("success");
          } else if (txData.status === "failed") {
            clearInterval(checkStatus);
            setStep("error");
            setErrorMessage("The transaction was declined or failed.");
            toast.error("The transaction was declined or failed.");
          }
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(checkStatus);
        if (step === "processing") {
          setStep("error");
          setErrorMessage("Payment timed out. Please check your MoMo balance.");
          toast.error("Payment timed out. Please check your MoMo balance.");
        }
      }, 120000);
    } catch (error: any) {
      console.error("Payment Error:", error);
      setStep("error");
      setErrorMessage(error.message || "An unexpected error occurred.");
      toast.error(error.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
      <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-0 flex justify-between items-center">
          <h3 className="text-3xl font-black tracking-tight">
            Support {creatorName}
          </h3>
          <button
            onClick={onClose}
            className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          {step === "input" && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-slate-500 text-sm font-medium mb-4">
                  How much would you like to gift {creatorName}?
                </p>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full text-center text-7xl font-black text-slate-900 outline-none placeholder:text-slate-100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="block text-[10px] font-black text-slate-300 mt-2 uppercase tracking-[0.3em]">
                    Rwandan Francs (RWF)
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  MoMo Phone Number
                </label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    type="tel"
                    placeholder="078 000 0000"
                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-lg font-bold focus:border-orange-500 outline-none transition-all"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={handleSupport}
                disabled={!amount || parseInt(amount) < 100 || !phone}
                className="w-full bg-orange-600 text-white py-6 rounded-lg font-black text-xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
              >
                Pay with MoMo
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-orange-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-xl font-black">
                Waiting for Confirmation...
              </h4>
              <p className="text-slate-500 font-medium leading-relaxed">
                We sent a MoMo prompt to <b>{phone}</b>.<br />
                Please enter your PIN. <b>Do not close this window.</b>
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={48} />
              </div>
              <h4 className="text-3xl font-black text-slate-900">
                Payment Verified!
              </h4>
              <p className="text-slate-500 font-medium leading-relaxed">
                Your gift of <b>{amount} RWF</b> has been delivered.{" "}
                {creatorName} is extremely grateful!
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-4 rounded-lg font-black hover:bg-orange-600 transition-colors"
              >
                Back to Profile
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                Payment Failed
              </h4>
              <p className="text-slate-500 font-medium leading-relaxed">
                {errorMessage}
              </p>
              <button
                onClick={() => setStep("input")}
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-lg font-black hover:bg-slate-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add these imports at the top of your file
